import { pathToEnumKey, pathToPayloadName } from './utils.js';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

interface PathItem {
  [method: string]: {
    requestBody?: {
      content?: Record<string, unknown>;
      required?: boolean;
    };
  };
}

export interface OpenApiSchema {
  paths?: Record<string, PathItem>;
}

export function extractPathEnum(schema: OpenApiSchema): string {
  const paths = Object.keys(schema.paths ?? {});
  if (paths.length === 0) return '';

  const entries = paths.map((p) => {
    const key = pathToEnumKey(p);
    return `  ${key} = '${p}',`;
  });

  const buildRouteHelper = [
    '// ── Route Builder ────────────────────────────────────────────────────────────',
    '/**',
    ' * Replace path parameters in a route template with actual values.',
    ' * @example',
    " * buildRoute(ApiRoute.RolesRoleIdButtonsButtonId, { role_id: 42, button_id: 7 })",
    " * // → '/roles/42/buttons/7'",
    ' */',
    'export function buildRoute(',
    '  route: ApiRoute,',
    '  params: Record<string, string | number>,',
    '): string {',
    '  return Object.entries(params).reduce(',
    '    (url, [key, val]) => url.replace(`{${key}}`, String(val)),',
    '    route as string,',
    '  );',
    '}',
  ].join('\n');

  return [
    '// ── API Route Enum ───────────────────────────────────────────────────────────',
    'export enum ApiRoute {',
    ...entries,
    '}',
    '',
    buildRouteHelper,
  ].join('\n');
}

export function extractHttpMethodEnum(schema: OpenApiSchema): string {
  const paths = schema.paths ?? {};
  const usedMethods = new Set<string>();

  for (const pathItem of Object.values(paths)) {
    for (const method of HTTP_METHODS) {
      if (pathItem[method]) usedMethods.add(method);
    }
  }

  if (usedMethods.size === 0) return '';

  const entries = [...usedMethods].map((m) => {
    const key = m.charAt(0).toUpperCase() + m.slice(1);
    return `  ${key} = '${m}',`;
  });

  return [
    '// ── HTTP Method Enum ─────────────────────────────────────────────────────────',
    'export enum HttpMethod {',
    ...entries,
    '}',
  ].join('\n');
}

interface PayloadEntry {
  pathStr: string;
  method: string;
  baseName: string;
  contentTypes: string[];
}

export function extractPayloads(schema: OpenApiSchema): string {
  const paths = schema.paths ?? {};

  // First pass: collect all entries with their base names
  const entries: PayloadEntry[] = [];
  for (const [pathStr, pathItem] of Object.entries(paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method as HttpMethod];
      if (!operation?.requestBody) continue;
      entries.push({
        pathStr,
        method,
        baseName: pathToPayloadName(pathStr),
        contentTypes: Object.keys(operation.requestBody.content ?? {}),
      });
    }
  }

  if (entries.length === 0) return '';

  // Detect base names that collide across any entries
  const nameCount = new Map<string, number>();
  for (const e of entries) nameCount.set(e.baseName, (nameCount.get(e.baseName) ?? 0) + 1);

  const lines: string[] = [
    '// ── Request Payload Types ────────────────────────────────────────────────────',
    "type Payload<\n  R extends keyof paths,\n  M extends keyof paths[R],\n  C extends string = 'application/json',\n> = paths[R][M] extends { requestBody: { content: Record<C, infer T> } } ? T : never;",
    '',
  ];

  for (const { pathStr, method, baseName, contentTypes } of entries) {
    const isColliding = (nameCount.get(baseName) ?? 0) > 1;
    const payloadName = isColliding ? pathToPayloadName(pathStr, method) : baseName;
    const enumKey = pathToEnumKey(pathStr);
    const methodKey = method.charAt(0).toUpperCase() + method.slice(1);
    const hasJson = contentTypes.includes('application/json');

    if (hasJson) {
      lines.push(`export type ${payloadName} = Payload<ApiRoute.${enumKey}, HttpMethod.${methodKey}>;`);
    } else if (contentTypes.length > 0) {
      lines.push(`export type ${payloadName} = Payload<ApiRoute.${enumKey}, HttpMethod.${methodKey}, '${contentTypes[0]}'>;`);
    } else {
      lines.push(`export type ${payloadName} = paths[ApiRoute.${enumKey}][HttpMethod.${methodKey}]['requestBody'];`);
    }
  }

  return lines.join('\n');
}
