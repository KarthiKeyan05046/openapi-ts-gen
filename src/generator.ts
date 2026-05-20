import openapiTS, { astToString } from 'openapi-typescript';
import converter from 'swagger2openapi';

export async function normalizeSchema(
  schema: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const isSwagger2 = typeof schema.swagger === 'string' && schema.swagger.startsWith('2.');
  if (!isSwagger2) return schema;

  const result = await converter.convertObj(schema as unknown as Parameters<typeof converter.convertObj>[0], {
    patch: true,
    warnOnly: true,
  });
  return result.openapi as unknown as Record<string, unknown>;
}

export async function generateTypes(schema: Record<string, unknown>): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ast = await openapiTS(schema as any, { exportType: true });
  return astToString(ast);
}
