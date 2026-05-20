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

export function extractPayloads(schema: OpenApiSchema): string {
  const paths = schema.paths ?? {};
  const lines: string[] = [
    '// ── Request Payload Types ────────────────────────────────────────────────────',
    "type Payload<\n  R extends keyof paths,\n  M extends keyof paths[R],\n  C extends string = 'application/json',\n> = paths[R][M] extends { requestBody: { content: Record<C, infer T> } } ? T : never;",
  ];

  let found = false;

  for (const [pathStr, pathItem] of Object.entries(paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method as HttpMethod];
      if (!operation?.requestBody) continue;

      found = true;
      const payloadName = pathToPayloadName(pathStr);
      const enumKey = pathToEnumKey(pathStr);

      // Resolve to application/json content type if present, fallback to generic requestBody
      const contentTypes = Object.keys(operation.requestBody.content ?? {});
      const hasJson = contentTypes.includes('application/json');

      if (hasJson) {
        lines.push(
          `export type ${payloadName} =\n  Payload<ApiRoute.${enumKey}, '${method}'>;`,
        );
      } else if (contentTypes.length > 0) {
        const firstType = contentTypes[0];
        lines.push(
          `export type ${payloadName} =\n  Payload<ApiRoute.${enumKey}, '${method}', '${firstType}'>;`,
        );
      } else {
        lines.push(
          `export type ${payloadName} =\n  paths[ApiRoute.${enumKey}]['${method}']['requestBody'];`,
        );
      }
    }
  }

  if (!found) return '';
  return lines.join('\n');
}
