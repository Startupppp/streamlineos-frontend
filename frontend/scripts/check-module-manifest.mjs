import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  BACKEND_ROOT,
  backendAvailable,
  backendUnreachableReason,
  reportBackendUnreachable,
} from "./check-repo-paths.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const FRONTEND_MANIFEST = join(ROOT, "lib", "module-manifest.json");
// Found by marker, not by relative depth: `<frontend>/../backend` does not exist
// on a sibling checkout, and the miss downgraded rule-1 to a green NOTICE.
const BACKEND_REGISTRY = backendAvailable
  ? join(BACKEND_ROOT, "src", "common", "rbac", "module-registry.ts")
  : null;
const SIDEBAR_PRODUCTS = join(
  ROOT,
  "components",
  "layout",
  "sidebar",
  "sidebar-products.ts",
);
const MANIFEST_LOADER = join(ROOT, "lib", "module-manifest.ts");

const PRODUCT_HREF_EXCEPTIONS = {
  administration: "/settings",
  documents: "/knowledge/chat",
};

const PRODUCT_KEY_EXCEPTIONS = new Set(["administration"]);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function parseRegistryVersion(content) {
  const match = /MODULE_MANIFEST_VERSION\s*=\s*(\d+)/.exec(content);
  return match ? Number(match[1]) : null;
}

function parseAdministersNamespaces(line) {
  if (/\badministersNamespaces:\s*NONE\b/.exec(line)) return [];
  const arrayMatch = /\badministersNamespaces:\s*\[([^\]]*)\]/.exec(line);
  if (!arrayMatch) return undefined;
  return arrayMatch[1]
    .split(",")
    .map((entry) => entry.trim().replace(/^["']|["']$/g, ""))
    .filter((entry) => entry.length > 0);
}

export function parseRegistryModules(content) {
  const registryStart = content.indexOf("MODULE_REGISTRY = [");
  if (registryStart === -1) return null;

  const slice = content.slice(registryStart);
  const modules = [];
  let current = null;

  for (const line of slice.split("\n")) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("{")) current = {};

    if (current !== null) {
      const idMatch = /\bid:\s*"([^"]+)"/.exec(line);
      if (idMatch) current.id = idMatch[1];

      const pkMatch = /productKey:\s*(?:"([^"]+)"|(null))/.exec(line);
      if (pkMatch) current.productKey = pkMatch[1] ?? null;

      const routeMatch = /\broute:\s*(?:"([^"]+)"|(null))/.exec(line);
      if (routeMatch) current.route = routeMatch[1] ?? null;

      const namespaces = parseAdministersNamespaces(line);
      if (namespaces !== undefined) current.administersNamespaces = namespaces;
    }

    const closesObject =
      trimmed.startsWith("},") ||
      trimmed === "}" ||
      trimmed.endsWith("},") ||
      trimmed.endsWith("}");

    if (closesObject && current?.id) {
      modules.push(current);
      current = null;
    }

    if (line.includes("] as const")) break;
  }

  return modules;
}

function parseSidebarProductKeys(content) {
  const keys = [];
  const re = /\bkey:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(content)) !== null) keys.push(m[1]);
  return keys;
}

function parseLoaderExpectedVersion(content) {
  const match = /EXPECTED_MANIFEST_VERSION\s*=\s*(\d+)/.exec(content);
  return match ? Number(match[1]) : null;
}

export function checkRegistryAgreement(manifest, registryContent) {
  const violations = [];

  const registryVersion = parseRegistryVersion(registryContent);
  if (registryVersion === null) {
    violations.push(
      "  [rule-1] Could not extract MODULE_MANIFEST_VERSION from the registry file",
    );
    return violations;
  }

  if (registryVersion !== manifest.version) {
    violations.push(
      `  [rule-1] Version mismatch: manifest.version=${manifest.version}, registry MODULE_MANIFEST_VERSION=${registryVersion}`,
    );
  }

  const registryModules = parseRegistryModules(registryContent);
  if (registryModules === null) {
    violations.push(
      "  [rule-1] Could not locate MODULE_REGISTRY array in the registry file",
    );
    return violations;
  }

  const manifestIds = new Set(manifest.modules.map((m) => m.id));
  const registryIds = new Set(registryModules.map((m) => m.id));

  for (const id of registryIds) {
    if (!manifestIds.has(id))
      violations.push(
        `  [rule-1] Registry module "${id}" is missing from the vendored manifest`,
      );
  }
  for (const id of manifestIds) {
    if (!registryIds.has(id))
      violations.push(
        `  [rule-1] Manifest module "${id}" is not in the backend registry`,
      );
  }

  for (const registryModule of registryModules) {
    const manifestModule = manifest.modules.find(
      (m) => m.id === registryModule.id,
    );
    if (!manifestModule) continue;

    if (registryModule.productKey !== manifestModule.productKey) {
      violations.push(
        `  [rule-1] Module "${registryModule.id}" productKey mismatch: manifest="${manifestModule.productKey}", registry="${registryModule.productKey}"`,
      );
    }

    if (registryModule.route !== manifestModule.route) {
      violations.push(
        `  [rule-1] Module "${registryModule.id}" route mismatch: manifest="${manifestModule.route}", registry="${registryModule.route}"`,
      );
    }
  }

  violations.push(...compareAdministersNamespaces(registryModules, manifest.modules));

  return violations;
}

export function compareAdministersNamespaces(registryModules, manifestModules) {
  const violations = [];
  const registryById = new Map(registryModules.map((m) => [m.id, m]));
  const manifestById = new Map(manifestModules.map((m) => [m.id, m]));
  const allIds = new Set([...registryById.keys(), ...manifestById.keys()]);

  for (const id of allIds) {
    const registryModule = registryById.get(id);
    const manifestModule = manifestById.get(id);

    if (!registryModule) {
      violations.push(
        `  [rule-5] Module "${id}" administersNamespaces=[${(manifestModule.administersNamespaces ?? []).join(", ")}] is in the vendored manifest but not in the backend registry`,
      );
      continue;
    }
    if (!manifestModule) {
      violations.push(
        `  [rule-5] Module "${id}" administersNamespaces=[${(registryModule.administersNamespaces ?? []).join(", ")}] is in the backend registry but not in the vendored manifest`,
      );
      continue;
    }
    if (registryModule.administersNamespaces === undefined) {
      violations.push(
        `  [rule-5] Could not parse administersNamespaces for registry module "${id}" — the parser found neither NONE nor an array literal, regenerate the module list check`,
      );
      continue;
    }

    const registrySet = new Set(registryModule.administersNamespaces);
    const manifestSet = new Set(manifestModule.administersNamespaces ?? []);
    const matches =
      registrySet.size === manifestSet.size &&
      [...registrySet].every((namespace) => manifestSet.has(namespace));
    if (!matches) {
      violations.push(
        `  [rule-5] Module "${id}" administersNamespaces mismatch: registry=[${[...registrySet].sort().join(", ")}], vendored manifest=[${[...manifestSet].sort().join(", ")}] — regenerate frontend/lib/module-manifest.json via backend/src/scripts/export-module-manifest.ts, never hand-edit it`,
      );
    }
  }

  return violations;
}

function checkProductKeySet(manifest, sidebarContent) {
  const violations = [];
  const manifestProductKeys = new Set(
    manifest.modules
      .filter((m) => m.productKey !== null)
      .map((m) => m.productKey),
  );

  const sidebarKeys = parseSidebarProductKeys(sidebarContent);
  for (const key of sidebarKeys) {
    if (
      !PRODUCT_KEY_EXCEPTIONS.has(key) &&
      !manifestProductKeys.has(key)
    ) {
      violations.push(
        `  [rule-2] PRODUCT_DEFINITIONS key "${key}" is not a manifest productKey and not in PRODUCT_KEY_EXCEPTIONS`,
      );
    }
  }
  return violations;
}

function checkProductHrefs(manifest, sidebarContent) {
  const violations = [];
  const manifestRouteByProductKey = new Map(
    manifest.modules
      .filter((m) => m.productKey !== null && m.route !== null)
      .map((m) => [m.productKey, m.route]),
  );

  const sidebarKeys = parseSidebarProductKeys(sidebarContent);
  for (const key of sidebarKeys) {
    if (key in PRODUCT_HREF_EXCEPTIONS) continue;
    if (PRODUCT_KEY_EXCEPTIONS.has(key)) continue;

    const expectedRoute = manifestRouteByProductKey.get(key);
    if (expectedRoute === undefined) {
      violations.push(
        `  [rule-3] PRODUCT_DEFINITIONS key "${key}" has no manifest route to validate against`,
      );
    }
  }
  return violations;
}

function checkLoaderVersion(manifest, loaderContent) {
  const violations = [];
  const loaderVersion = parseLoaderExpectedVersion(loaderContent);

  if (loaderVersion === null) {
    violations.push(
      "  [rule-4] Could not extract EXPECTED_MANIFEST_VERSION from module-manifest.ts",
    );
    return violations;
  }

  if (loaderVersion !== manifest.version) {
    violations.push(
      `  [rule-4] EXPECTED_MANIFEST_VERSION=${loaderVersion} in module-manifest.ts does not match manifest.version=${manifest.version}`,
    );
  }

  return violations;
}

function runSelfTest() {
  console.log("Running self-test with deliberately broken fixtures...\n");
  let passed = 0;
  let failed = 0;

  function assert(label, condition) {
    if (condition) {
      console.log(`  PASS  ${label}`);
      passed++;
    } else {
      console.error(`  FAIL  ${label}`);
      failed++;
    }
  }

  const validManifest = {
    version: 1,
    modules: [
      { id: "hr", productKey: "hrms", route: "/hr" },
      { id: "build", productKey: "build", route: "/build" },
    ],
  };

  {
    const brokenRegistry = `
      export const MODULE_MANIFEST_VERSION = 2;
      export const MODULE_REGISTRY = [
        { id: "hr", productKey: "hrms", route: "/hr" },
        { id: "build", productKey: "build", route: "/build" },
      ] as const satisfies readonly [];
    `;
    const v = checkRegistryAgreement(validManifest, brokenRegistry);
    assert("rule-1 fires on version mismatch", v.some((s) => s.includes("rule-1")));
  }

  {
    const brokenRegistry = `
      export const MODULE_MANIFEST_VERSION = 1;
      export const MODULE_REGISTRY = [
        { id: "hr", productKey: "hrms", route: "/hr" },
        { id: "build", productKey: "build", route: "/build" },
        { id: "crm", productKey: "crm", route: "/crm" },
      ] as const satisfies readonly [];
    `;
    const v = checkRegistryAgreement(validManifest, brokenRegistry);
    assert(
      "rule-1 fires when registry has module not in manifest",
      v.some((s) => s.includes("crm") && s.includes("rule-1")),
    );
  }

  {
    const brokenRegistry = `
      export const MODULE_MANIFEST_VERSION = 1;
      export const MODULE_REGISTRY = [
        { id: "hr", productKey: "hrms", route: "/hr" },
      ] as const satisfies readonly [];
    `;
    const v = checkRegistryAgreement(validManifest, brokenRegistry);
    assert(
      "rule-1 fires when manifest has module not in registry",
      v.some((s) => s.includes("build") && s.includes("rule-1")),
    );
  }

  {
    const brokenRegistry = `
      export const MODULE_MANIFEST_VERSION = 1;
      export const MODULE_REGISTRY = [
        { id: "hr", productKey: "hr_changed", route: "/hr" },
        { id: "build", productKey: "build", route: "/build" },
      ] as const satisfies readonly [];
    `;
    const v = checkRegistryAgreement(validManifest, brokenRegistry);
    assert(
      "rule-1 fires on productKey drift",
      v.some((s) => s.includes("productKey") && s.includes("rule-1")),
    );
  }

  {
    const brokenRegistry = `
      export const MODULE_MANIFEST_VERSION = 1;
      export const MODULE_REGISTRY = [
        { id: "hr", productKey: "hrms", route: "/hr-new" },
        { id: "build", productKey: "build", route: "/build" },
      ] as const satisfies readonly [];
    `;
    const v = checkRegistryAgreement(validManifest, brokenRegistry);
    assert(
      "rule-1 fires on route drift",
      v.some((s) => s.includes("route") && s.includes("rule-1")),
    );
  }

  {
    const brokenSidebar = `
      export const PRODUCT_DEFINITIONS = [
        { key: "hrms", label: "HRMS", href: resolveProductHref("hrms"), icon: X },
        { key: "phantom", label: "Phantom", href: resolveProductHref("phantom"), icon: X },
      ];
    `;
    const v = checkProductKeySet(validManifest, brokenSidebar);
    assert(
      "rule-2 fires on unknown product key",
      v.some((s) => s.includes("phantom") && s.includes("rule-2")),
    );
  }

  {
    const sidebarWithException = `
      export const PRODUCT_DEFINITIONS = [
        { key: "hrms", label: "HRMS", href: resolveProductHref("hrms"), icon: X },
        { key: "administration", label: "Administration", href: resolveProductHref("administration"), icon: X },
      ];
    `;
    const v = checkProductKeySet(validManifest, sidebarWithException);
    assert(
      "rule-2 does not fire for PRODUCT_KEY_EXCEPTIONS entries",
      !v.some((s) => s.includes("administration") && s.includes("rule-2")),
    );
  }

  {
    const brokenSidebar = `
      export const PRODUCT_DEFINITIONS = [
        { key: "hrms", label: "HRMS", href: resolveProductHref("hrms"), icon: X },
        { key: "orphan", label: "Orphan", href: resolveProductHref("orphan"), icon: X },
      ];
    `;
    const v = checkProductHrefs(validManifest, brokenSidebar);
    assert(
      "rule-3 fires when sidebar key has no manifest route",
      v.some((s) => s.includes("orphan") && s.includes("rule-3")),
    );
  }

  {
    const goodSidebar = `
      export const PRODUCT_DEFINITIONS = [
        { key: "hrms", label: "HRMS", href: resolveProductHref("hrms"), icon: X },
        { key: "build", label: "Build", href: resolveProductHref("build"), icon: X },
      ];
    `;
    const v = checkProductHrefs(validManifest, goodSidebar);
    assert(
      "rule-3 does not fire when all sidebar keys have manifest routes",
      v.length === 0,
    );
  }

  {
    const brokenLoader = `export const EXPECTED_MANIFEST_VERSION = 99;`;
    const v = checkLoaderVersion(validManifest, brokenLoader);
    assert(
      "rule-4 fires on EXPECTED_MANIFEST_VERSION mismatch",
      v.some((s) => s.includes("rule-4")),
    );
  }

  {
    const goodLoader = `export const EXPECTED_MANIFEST_VERSION = 1;`;
    const v = checkLoaderVersion(validManifest, goodLoader);
    assert(
      "rule-4 does not fire when versions agree",
      v.length === 0,
    );
  }

  assert(
    "parseRegistryVersion reads the declared version as a number",
    parseRegistryVersion("export const MODULE_MANIFEST_VERSION = 3;") === 3,
  );
  assert(
    "parseRegistryVersion returns null when the registry declares no version — rule-1 must go INCONCLUSIVE, not silently agree",
    parseRegistryVersion("export const MODULE_REGISTRY = [];") === null,
  );
  assert(
    "parseRegistryVersion does not confuse a lookalike constant for the real one",
    parseRegistryVersion("const LEGACY_MANIFEST_VERSION = 9;\nexport const MODULE_MANIFEST_VERSION = 1;") === 1,
  );

  console.log(`\nSelf-test complete: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

function runCheck() {
  const violations = [];

  const manifest = readJson(FRONTEND_MANIFEST);

  let registryCompared = false;
  if (BACKEND_REGISTRY === null || !existsSync(BACKEND_REGISTRY)) {
    reportBackendUnreachable(
      "check-module-manifest",
      "rule-1 (backend registry agreement)",
    );
  } else {
    const registryContent = readFileSync(BACKEND_REGISTRY, "utf8");
    const registryEntries = (registryContent.match(/\bid:\s*"/g) ?? []).length;
    if (registryEntries < 5) {
      console.error(
        `INCONCLUSIVE — check-module-manifest: parsed ${registryEntries} entries from ${BACKEND_REGISTRY} (floor 5); the registry parser is broken, so rule-1 proves nothing.`,
      );
      process.exit(2);
    }
    violations.push(...checkRegistryAgreement(manifest, registryContent));
    registryCompared = true;
  }

  if (!existsSync(SIDEBAR_PRODUCTS)) {
    console.error(`  [ERROR] Missing required file: ${SIDEBAR_PRODUCTS}`);
    process.exit(1);
  }
  const sidebarContent = readFileSync(SIDEBAR_PRODUCTS, "utf8");
  violations.push(...checkProductKeySet(manifest, sidebarContent));
  violations.push(...checkProductHrefs(manifest, sidebarContent));

  if (!existsSync(MANIFEST_LOADER)) {
    console.error(`  [ERROR] Missing required file: ${MANIFEST_LOADER}`);
    process.exit(1);
  }
  const loaderContent = readFileSync(MANIFEST_LOADER, "utf8");
  violations.push(...checkLoaderVersion(manifest, loaderContent));

  if (violations.length === 0) {
    console.log(
      registryCompared
        ? "✔  Module manifest is consistent."
        : "PARTIAL — module manifest is consistent with the frontend surfaces, but rule-1 (backend registry agreement) did NOT run.",
    );
    process.exit(0);
  } else {
    console.error(
      `✖  ${violations.length} module manifest violation(s) found:`,
    );
    for (const v of violations) console.error(v);
    process.exit(1);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  if (process.argv.includes("--self-test")) {
    runSelfTest();
    process.exit(0);
  }
  runCheck();
}
