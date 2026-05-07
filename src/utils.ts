import pluralize from 'pluralize';

export function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Singularize only the last word in a hyphen/underscore-separated segment.
 * e.g. "work-plans" → "work-plan", "genders" → "gender", "blood_pressure" → "blood_pressure"
 */
function singularizeSegment(segment: string): string {
  const parts = segment.split(/(-|_)/);
  const tokens: string[] = [];
  const separators: string[] = [];

  for (const part of parts) {
    if (part === '-' || part === '_') {
      separators.push(part);
    } else {
      tokens.push(part);
    }
  }

  if (tokens.length === 0) return segment;

  tokens[tokens.length - 1] = pluralize.singular(tokens[tokens.length - 1]);

  let result = '';
  for (let i = 0; i < tokens.length; i++) {
    result += tokens[i];
    if (i < separators.length) result += separators[i];
  }
  return result;
}

// Strip {param} braces — {role_id} → role_id
function stripBraces(seg: string): string {
  return seg.replace(/^\{(.+)\}$/, '$1');
}

/**
 * Converts an OpenAPI path string to a payload type name.
 * /post/genders/            →  Post_Gender_Payload
 * /roles/{role_id}/permissions  →  Roles_RoleId_Permission_Payload
 */
export function pathToPayloadName(path: string): string {
  const segments = path.split('/').filter(Boolean);
  const parts = segments.map((seg) => toPascalCase(singularizeSegment(stripBraces(seg))));
  return parts.join('') + 'Payload';
}

/**
 * Converts an OpenAPI path string to an enum key (no _Payload suffix).
 * /post/genders/            → PostGenders
 * /roles/{role_id}/permissions  → RolesRoleIdPermissions
 */
export function pathToEnumKey(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments.map((seg) => toPascalCase(stripBraces(seg))).join('');
}
