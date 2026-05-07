import openapiTS, { astToString } from 'openapi-typescript';

export async function generateTypes(source: string): Promise<string> {
  const resolvedSource = isUrl(source) ? new URL(source) : source;

  const ast = await openapiTS(resolvedSource, {
    exportType: true,
  });

  return astToString(ast);
}

function isUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}
