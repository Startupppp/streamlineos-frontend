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
  return [...source.matchAll(/^\s*name:\s*["'`]([^"'`]+)["'`]/gm)]
    .map((match) => match[1])
    .filter((name) => !name.includes("${"));
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
  return {
    permissions: sortedUnique([...declared, ...moduleAccessPermissions(delegableModuleIds)]),
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
