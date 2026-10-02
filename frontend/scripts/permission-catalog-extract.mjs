/**
 * Extractors for the vendored permission catalogue contract.
 *
 * The frontend's RBAC specs used to read these facts straight out of a SIBLING
 * backend checkout. CI clones one repository, so eight suites either failed at
 * module load or asserted nothing — which meant the page-level RBAC gate had
 * never once been enforced there. The facts are now vendored as
 * `contracts/permission-catalog.json`, exactly as `contracts/openapi.json`
 * already vendors the API contract.
 *
 * Every function here is a pure function of backend SOURCE TEXT, so the same
 * input always produces the same artifact and a byte-for-byte drift check is
 * meaningful. Nothing here may read the clock, the environment or a git SHA.
 */

const EXCLUDED_PERMISSION_FILES = new Set([
  "index.ts",
  "catalog.ts",
  "role-defaults.ts",
  "types.ts",
]);

export function isPermissionCatalogFile(fileName) {
  return fileName.endsWith(".ts") && !EXCLUDED_PERMISSION_FILES.has(fileName);
}

/** `name: "hr:leaves:view"` entries, skipping template literals the scan cannot resolve. */
export function extractPermissionNames(source) {
  return [...stripComments(source).matchAll(/^\s*name:\s*["'`]([^"'`]+)["'`]/gm)]
    .map((match) => match[1])
    .filter((name) => !name.includes("${"));
}

const QUOTED_VALUE = /^(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`)/;

function literalField(body, field) {
  const label = body.match(new RegExp(`\\b${field}:\\s*`));
  if (!label || label.index === undefined) return undefined;
  const value = body.slice(label.index + label[0].length).match(QUOTED_VALUE);
  if (!value) return undefined;
  return (value[1] ?? value[2] ?? value[3]).replace(/\\(.)/g, "$1");
}

export function stripComments(source) {
  let out = "";
  let quote = null;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quote !== null) {
      out += char;
      if (char === "\\") {
        out += source[i + 1] ?? "";
        i += 1;
      } else if (char === quote) quote = null;
      continue;
    }
    if (char === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 1;
      continue;
    }
    if (char === "/" && source[i + 1] === "/") {
      const end = source.indexOf("\n", i + 2);
      i = end === -1 ? source.length : end - 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    out += char;
  }
  return out;
}

export function extractPermissionObjects(source) {
  const results = [];
  for (const block of stripComments(source).matchAll(/\{([^{}]+)\}/g)) {
    const body = block[1];
    const name = literalField(body, "name");
    if (name === undefined || name.includes("${")) continue;
    const resource = literalField(body, "resource");
    const action = literalField(body, "action");
    const description = literalField(body, "description");
    if (resource === undefined || action === undefined || description === undefined) continue;
    const entry = { name, resource, action, description };
    const scopable = body.match(/\bscopable:\s*(true|false)/);
    if (scopable) entry.scopable = scopable[1] === "true";
    const baselineScope = literalField(body, "baselineScope");
    if (baselineScope !== undefined) entry.baselineScope = baselineScope;
    if (/(?:^|[\s,{])sensitive:\s*true\b/.test(body)) entry.sensitive = true;
    results.push(entry);
  }
  return results;
}

const MODULE_PLACEHOLDER = "__module__";

export function extractModuleAccessPermissionObjects(source, delegableModuleIds) {
  const variable = source.match(/\bname:\s*`\$\{(\w+)\}/);
  if (!variable) return [];
  const templated = source.split(`\${${variable[1]}}`).join(MODULE_PLACEHOLDER);
  const templates = extractPermissionObjects(templated).filter((entry) =>
    entry.name.startsWith(`${MODULE_PLACEHOLDER}:`),
  );
  return delegableModuleIds.flatMap((id) =>
    templates.map((entry) =>
      Object.fromEntries(
        Object.entries(entry).map(([field, value]) => [
          field,
          typeof value === "string" ? value.split(MODULE_PLACEHOLDER).join(id) : value,
        ]),
      ),
    ),
  );
}

/** Module ids whose ladder is `delegable`; each generates `<id>:access:view|manage`. */
export function extractDelegableModuleIds(source) {
  return [
    ...source.matchAll(/id:\s*["'`]([^"'`]+)["'`][\s\S]*?ladder:\s*["'`]([^"'`]+)["'`]/g),
  ]
    .filter((match) => match[2] === "delegable")
    .map((match) => match[1]);
}

export function moduleAccessPermissions(delegableModuleIds) {
  return delegableModuleIds.flatMap((id) => [`${id}:access:view`, `${id}:access:manage`]);
}

/**
 * The permission keys every MEMBER keeps by default. They are the block of
 * role-defaults.ts ABOVE the `ROLE_DEFAULT_PERMISSIONS` map; the map itself
 * lists every role, so scanning the whole file would report far more than a
 * member holds.
 */
export function extractMemberDefaultPermissions(source) {
  const end = source.indexOf("ROLE_DEFAULT_PERMISSIONS");
  const block = end === -1 ? source : source.slice(0, end);
  return [...block.matchAll(/"([a-z0-9-]+:[a-z0-9:-]+)"/g)].map((match) => match[1]);
}

export function extractUniversalMemberGrants(source) {
  const block = source.match(/UNIVERSAL_MEMBER_PERMISSION_GRANTS\s*=\s*\[([\s\S]*?)\]/);
  if (!block) return {};
  const grants = {};
  for (const match of block[1].matchAll(
    /permissionKey:\s*["'`]([^"'`]+)["'`]\s*,\s*scope:\s*["'`](own|all)["'`]/g,
  ))
    grants[match[1]] = match[2];
  return grants;
}

/** `"<id>": { ... reason: "<reason>" }` pairs from common/rbac/owner-only-operations.ts. */
export function extractOwnerOnlyOperations(source) {
  const entries = {};
  for (const match of source.matchAll(/"([^"]+)":\s*\{[^}]*?reason:\s*"([^"]+)"/gs))
    entries[match[1]] = match[2];
  return entries;
}

export function isRoleTemplateFile(fileName) {
  return /^role-templates.*\.constants\.ts$/.test(fileName);
}

export function extractRoleTemplatePermissions(sources, knownNames) {
  const known = new Set(knownNames);
  return sources.flatMap((source) =>
    [...stripComments(source).matchAll(/["']([a-z][a-z0-9_-]*(?::[a-z0-9_-]+)+)["']/g)]
      .map((match) => match[1])
      .filter((name) => known.has(name)),
  );
}

const PERMISSION_KEY = /^[a-z][a-z0-9_-]*(?::[a-z0-9_-]+)+$/;

export function isPermissionKey(value) {
  return PERMISSION_KEY.test(value);
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function sortedObject(entries) {
  const out = {};
  for (const key of Object.keys(entries).sort()) out[key] = entries[key];
  return out;
}

/**
 * Assemble the artifact from already-read source text. Kept separate from the
 * filesystem so the self-test can drive it with synthetic sources.
 */
export function buildCatalog({
  permissionSources,
  moduleRegistrySource,
  roleDefaultsSource,
  ownerOnlyOperationsSource,
  roleTemplateSources,
}) {
  const delegableModuleIds = sortedUnique(extractDelegableModuleIds(moduleRegistrySource));
  const declared = permissionSources.flatMap((source) => extractPermissionNames(source));
  const allNames = sortedUnique([...declared, ...moduleAccessPermissions(delegableModuleIds)]);

  const detailsByName = new Map();
  for (const source of permissionSources) {
    const objects = [
      ...extractPermissionObjects(source),
      ...extractModuleAccessPermissionObjects(source, delegableModuleIds),
    ];
    for (const { name, ...detail } of objects) {
      if (!detailsByName.has(name)) detailsByName.set(name, detail);
    }
  }

  const baselineScopes = extractUniversalMemberGrants(roleDefaultsSource);
  const permissionDetails = {};
  for (const name of allNames) {
    const detail = detailsByName.get(name);
    if (!detail) continue;
    const baselineScope = baselineScopes[name];
    permissionDetails[name] =
      baselineScope === undefined ? detail : { ...detail, baselineScope };
  }

  return {
    permissions: allNames,
    permissionDetails,
    delegableModuleIds,
    memberDefaultPermissions: sortedUnique(extractMemberDefaultPermissions(roleDefaultsSource)),
    ownerOnlyOperations: sortedObject(extractOwnerOnlyOperations(ownerOnlyOperationsSource)),
    roleTemplatePermissions: sortedUnique(extractRoleTemplatePermissions(roleTemplateSources, allNames)),
  };
}

/** One canonical serialisation, so "byte-for-byte" is a stable claim. */
export function serializeCatalog(catalog) {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

/** Every `x-permission` an operation in the vendored OpenAPI contract declares. */
export function openApiPermissions(document) {
  const found = new Set();
  const walk = (node) => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (node === null || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (key !== "x-permission") {
        walk(value);
        continue;
      }
      if (typeof value === "string") found.add(value);
      else if (Array.isArray(value))
        for (const entry of value) if (typeof entry === "string") found.add(entry);
    }
  };
  walk(document);
  return [...found].sort();
}

export function runtimeAgreementFailures(catalog, runtimeRows) {
  const failures = [];
  const vendored = new Set(catalog.permissions ?? []);
  const runtime = new Map(runtimeRows.map((row) => [row.name, row]));
  for (const name of runtime.keys())
    if (!vendored.has(name)) failures.push(`runtime key "${name}" is absent from the vendored catalogue`);
  for (const name of vendored)
    if (!runtime.has(name)) failures.push(`vendored key "${name}" is not in the backend runtime PERMISSIONS`);
  for (const [name, row] of runtime) {
    const detail = catalog.permissionDetails?.[name];
    if (!detail) continue;
    for (const field of METADATA_FIELDS)
      if (row[field] !== detail[field])
        failures.push(
          `"${name}".${field} is ${JSON.stringify(row[field])} at runtime but ${JSON.stringify(detail[field])} in the vendored catalogue`,
        );
  }
  return failures;
}

const METADATA_FIELDS = ["resource", "action", "description", "scopable", "baselineScope", "sensitive"];

function serializeMetadataEntry(name, detail) {
  const fields = METADATA_FIELDS.filter((field) => detail[field] !== undefined).map(
    (field) => `${field}: ${JSON.stringify(detail[field])}`,
  );
  return `  ${JSON.stringify(name)}: { ${fields.join(", ")} },`;
}

export function serializePermissionKeyTs({ permissions, permissionDetails }) {
  const union = permissions.map((key) => `  | "${key}"`).join("\n");
  const metadata = permissions
    .map((key) => serializeMetadataEntry(key, permissionDetails[key] ?? {}))
    .join("\n");
  return [
    `export type PermissionKey =\n${union};`,
    "",
    "export interface PermissionMetadata {",
    "  resource: string;",
    "  action: string;",
    "  description: string;",
    "  scopable?: boolean;",
    '  baselineScope?: "own" | "all";',
    "  sensitive?: true;",
    "}",
    "",
    "export interface Permission extends PermissionMetadata {",
    "  name: PermissionKey;",
    "}",
    "",
    "export const PERMISSION_METADATA: Readonly<Record<PermissionKey, PermissionMetadata>> = {",
    metadata,
    "};",
    "",
    "export function isPermissionKey(value: string): value is PermissionKey {",
    "  return Object.hasOwn(PERMISSION_METADATA, value);",
    "}",
    "",
  ].join("\n");
}

export function tsUnionAgreementFailures(catalog, tsSource) {
  if (tsSource === serializePermissionKeyTs(catalog)) return [];
  const matches = [...tsSource.matchAll(/^\s+\|\s+"([^"]+)"/gm)].map((m) => m[1]);
  if (matches.length === 0)
    return ["permission-key.generated.ts contains no union members — possible corruption"];
  const fromTs = [...matches].sort();
  const fromJson = [...(catalog.permissions ?? [])].sort();
  const tsSet = new Set(fromTs);
  const jsonSet = new Set(fromJson);
  const onlyInTs = fromTs.filter((k) => !jsonSet.has(k));
  const onlyInJson = fromJson.filter((k) => !tsSet.has(k));
  const failures = [];
  if (onlyInTs.length > 0)
    failures.push(`TS union has ${onlyInTs.length} key(s) not in JSON: ${onlyInTs.slice(0, 5).join(", ")}`);
  if (onlyInJson.length > 0)
    failures.push(`JSON has ${onlyInJson.length} key(s) not in TS union: ${onlyInJson.slice(0, 5).join(", ")}`);
  if (failures.length === 0)
    failures.push("permission-key.generated.ts metadata is not byte-identical to a serialisation of permission-catalog.json");
  return failures;
}
