import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const FRONTEND_MANIFEST = join(ROOT, "lib", "module-manifest.json");
const BACKEND_REGISTRY = join(
  ROOT,
  "..",
  "backend",
  "src",
  "common",
  "rbac",
  "module-registry.ts",
);
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

function parseRegistryModules(content) {
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

function checkRegistryAgreement(manifest, registryContent) {
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

  console.log(`\nSelf-test complete: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

if (process.argv.includes("--self-test")) {
  runSelfTest();
  process.exit(0);
}

const violations = [];

const manifest = readJson(FRONTEND_MANIFEST);

if (!existsSync(BACKEND_REGISTRY)) {
  console.warn(
    "  [NOTICE] backend/ is absent from the working tree — rule-1 (registry agreement) is SKIPPED.",
  );
  console.warn(
    "  Re-run from a workspace where both repos are present to validate the vendored manifest.",
  );
} else {
  const registryContent = readFileSync(BACKEND_REGISTRY, "utf8");
  violations.push(...checkRegistryAgreement(manifest, registryContent));
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
  console.log("✔  Module manifest is consistent.");
  process.exit(0);
} else {
  console.error(
    `✖  ${violations.length} module manifest violation(s) found:`,
  );
  for (const v of violations) console.error(v);
  process.exit(1);
}
