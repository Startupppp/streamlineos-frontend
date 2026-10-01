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

/** `"<id>": { ... reason: "<reason>" }` pairs from common/rbac/owner-only-operations.ts. */
export function extractOwnerOnlyOperations(source) {
  const entries = {};
  for (const match of source.matchAll(/"([^"]+)":\s*\{[^}]*?reason:\s*"([^"]+)"/gs))
    entries[match[1]] = match[2];
  return entries;
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

  const permissionDetails = {};
  for (const name of allNames) {
    const detail = detailsByName.get(name);
    if (detail) permissionDetails[name] = detail;
  }

  return {
    permissions: allNames,
    permissionDetails,
    delegableModuleIds,
    memberDefaultPermissions: sortedUnique(extractMemberDefaultPermissions(roleDefaultsSource)),
    ownerOnlyOperations: sortedObject(extractOwnerOnlyOperations(ownerOnlyOperationsSource)),
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
