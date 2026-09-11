import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const frontendRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(frontendRoot, "app");
const prefetchRoot = path.join(frontendRoot, "lib", "prefetch");
const buildRoot = path.join(frontendRoot, ".next");

const authenticatedRoutes = [
  {
    name: "directory workers",
    source: path.join(sourceRoot, "(authenticated)", "directory", "workers", "page.tsx"),
    prefetch: path.join(prefetchRoot, "directory.ts"),
    hydrationTest: path.join(frontendRoot, "features", "directory", "workers", "workers-page.test.tsx"),
  },
  {
    name: "settings roles",
    source: path.join(sourceRoot, "(authenticated)", "settings", "roles", "page.tsx"),
    prefetch: path.join(prefetchRoot, "roles.ts"),
    hydrationTest: path.join(frontendRoot, "features", "settings", "roles", "roles-page.test.tsx"),
  },
  {
    name: "payroll runs",
    source: path.join(sourceRoot, "(authenticated)", "payroll", "runs", "page.tsx"),
    prefetch: path.join(prefetchRoot, "payroll.ts"),
    hydrationTest: path.join(frontendRoot, "features", "payroll", "runs", "runs-page-content.test.tsx"),
  },
  {
    name: "HR assets",
    source: path.join(sourceRoot, "(authenticated)", "hr", "assets", "page.tsx"),
    prefetch: path.join(prefetchRoot, "hr.ts"),
    hydrationTest: path.join(frontendRoot, "features", "hr", "assets", "assets-page.test.tsx"),
  },
  {
    name: "HR documents",
    source: path.join(sourceRoot, "(authenticated)", "hr", "documents", "page.tsx"),
    prefetch: path.join(prefetchRoot, "hr.ts"),
    hydrationTest: path.join(frontendRoot, "features", "hr", "documents", "documents-page.test.tsx"),
  },
];

const publicRoutes = [
  path.join(sourceRoot, "(public)", "help", "[orgId]", "page.tsx"),
  path.join(sourceRoot, "(public)", "help", "[orgId]", "[slug]", "page.tsx"),
  path.join(sourceRoot, "(public)", "application-status", "[token]", "page.tsx"),
  path.join(sourceRoot, "(public)", "offer", "[token]", "page.tsx"),
  path.join(sourceRoot, "(public)", "refer", "link", "[token]", "page.tsx"),
  path.join(sourceRoot, "(public)", "vendor-portal", "[token]", "page.tsx"),
];

const read = (file) => readFile(file, "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`server-data seam verification failed: ${message}`);
};
const sourceHas = (source, needle, file) =>
  assert(source.includes(needle), `${path.relative(frontendRoot, file)} must contain ${needle}`);

/**
 * The seam's invariant is React `cache()` memoizing per (token, path) behind an
 * export that mints its own token — NOT one particular source spelling. A string
 * match on the signature broke the moment a parameter was added and the arrow was
 * reformatted, while the invariant it stood for was untouched, so it is asserted
 * from the AST instead. Every check below fails closed on an unreadable shape.
 */
function verifyServerFetchSeam(source, file) {
  const rel = path.relative(frontendRoot, file);
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const isExported = (node) =>
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

  let cacheLocal = null;
  for (const stmt of parsed.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier) || stmt.moduleSpecifier.text !== "react") continue;
    const named = stmt.importClause?.namedBindings;
    if (!named || !ts.isNamedImports(named)) continue;
    for (const el of named.elements)
      if ((el.propertyName ?? el.name).text === "cache") cacheLocal = el.name.text;
  }
  assert(cacheLocal, `${rel} must import { cache } from "react" — the per-request memo is what dedupes the seam`);

  const cacheCalls = [];
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === cacheLocal)
      cacheCalls.push(node);
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  assert(
    cacheCalls.length === 1,
    `${rel} must wrap exactly one function in ${cacheLocal}() — found ${cacheCalls.length}; removing the wrapper refetches per caller`,
  );

  const [cacheCall] = cacheCalls;
  const wrapped = cacheCall.arguments[0];
  assert(
    wrapped && (ts.isArrowFunction(wrapped) || ts.isFunctionExpression(wrapped)),
    `${rel} must pass a function literal to ${cacheLocal}() so its parameters can be checked`,
  );
  const params = wrapped.parameters;
  const isStringParam = (p, name) =>
    p && ts.isIdentifier(p.name) && p.name.text === name && p.type?.kind === ts.SyntaxKind.StringKeyword;
  assert(
    isStringParam(params[0], "token") && isStringParam(params[1], "path"),
    `${rel} must memoize on (token: string, path: string) — the cached function's first two parameters key the memo, and dropping either shares one response across tokens or across paths`,
  );

  const cachedDecl = cacheCall.parent;
  assert(
    ts.isVariableDeclaration(cachedDecl) && ts.isIdentifier(cachedDecl.name),
    `${rel} must assign the ${cacheLocal}() result to a module-level const`,
  );
  const cachedName = cachedDecl.name.text;
  const cachedStatement = cachedDecl.parent.parent;
  assert(
    ts.isVariableStatement(cachedStatement) && !isExported(cachedStatement),
    `${rel} must keep ${cachedName} module-private — exporting it lets a caller supply any token`,
  );
  for (const stmt of parsed.statements) {
    if (!ts.isExportDeclaration(stmt) || !stmt.exportClause || !ts.isNamedExports(stmt.exportClause)) continue;
    for (const el of stmt.exportClause.elements)
      assert(
        (el.propertyName ?? el.name).text !== cachedName,
        `${rel} must not re-export ${cachedName} — a caller holding it can read any token's data`,
      );
  }

  const serverGet = parsed.statements.find(
    (s) => ts.isFunctionDeclaration(s) && s.name?.text === "serverGet" && isExported(s),
  );
  assert(serverGet, `${rel} must export a serverGet function`);
  for (const p of serverGet.parameters)
    assert(
      !(ts.isIdentifier(p.name) && /token|jwt|auth/i.test(p.name.text)),
      `${rel} serverGet must not accept a credential parameter (${ts.isIdentifier(p.name) ? p.name.text : "?"}) — the token is minted per call, never threaded in by a caller`,
    );

  let mintedCall = false;
  const visitGet = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === cachedName) {
      const first = node.arguments[0];
      if (
        first &&
        ts.isAwaitExpression(first) &&
        ts.isCallExpression(first.expression) &&
        ts.isIdentifier(first.expression.expression) &&
        first.expression.expression.text === "getServerToken" &&
        first.expression.arguments.length === 0
      )
        mintedCall = true;
    }
    ts.forEachChild(node, visitGet);
  };
  visitGet(serverGet);
  assert(
    mintedCall,
    `${rel} serverGet must call ${cachedName}(await getServerToken(), …) — passing anything else as the memo's token leaks one caller's response to the next`,
  );
}

function callPositions(source, file, names) {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const positions = new Map(names.map((name) => [name, []]));
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      positions.get(node.expression.text)?.push(node.getStart(parsed));
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return positions;
}

async function selfTest() {
  process.stdout.write("=== verify:server-data-seam self-test ===\n");
  const syntheticPath = "/synthetic/server-fetch.ts";

  const goodContent = [
    'import "server-only";',
    'import { cache } from "react";',
    "const TIMEOUT_MS = 10000;",
    "const cachedFetch = cache(async (token: string, path: string) => {",
    "  const headers = new Headers();",
    "  headers.set(\"Authorization\", `Bearer ${token}`);",
    '  return fetch(path, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS), headers });',
    "});",
    "function getServerToken() { return Promise.resolve(\"tok\"); }",
    "export async function serverGet(apiPath: string) {",
    "  return cachedFetch(await getServerToken(), apiPath);",
    "}",
  ].join("\n");

  let passed = 0;
  let failed = 0;

  const expectPass = (description, fn) => {
    try {
      fn();
      process.stdout.write(`  PASS: ${description}\n`);
      passed++;
    } catch (e) {
      process.stdout.write(`  FAIL: ${description} — unexpected throw: ${e?.message}\n`);
      failed++;
    }
  };

  const expectFail = (description, fn, fragment) => {
    try {
      fn();
      process.stdout.write(`  FAIL: ${description} — did not throw\n`);
      failed++;
    } catch (e) {
      if (e?.message?.includes(fragment)) {
        process.stdout.write(`  PASS: ${description}\n`);
        passed++;
      } else {
        process.stdout.write(`  FAIL: ${description} — wrong message: "${e?.message}"\n`);
        failed++;
      }
    }
  };

  expectPass("valid server-fetch.ts passes verifyServerFetchSeam", () =>
    verifyServerFetchSeam(goodContent, syntheticPath),
  );

  const badNoCache = goodContent.replace('import { cache } from "react";\n', "");
  expectFail(
    'missing cache() import rejected with expected message',
    () => verifyServerFetchSeam(badNoCache, syntheticPath),
    'must import { cache } from "react"',
  );

  const badExportedCache = goodContent.replace(
    "const cachedFetch = cache(",
    "export const cachedFetch = cache(",
  );
  expectFail(
    "exported cache const rejected",
    () => verifyServerFetchSeam(badExportedCache, syntheticPath),
    "must keep",
  );

  const badNoServerGet = goodContent.replace(
    "export async function serverGet(",
    "async function serverGet(",
  );
  expectFail(
    'missing serverGet export rejected with expected message',
    () => verifyServerFetchSeam(badNoServerGet, syntheticPath),
    "must export a serverGet function",
  );

  const badCredParam = goodContent.replace(
    "export async function serverGet(apiPath: string)",
    "export async function serverGet(token: string, apiPath: string)",
  );
  expectFail(
    "serverGet with credential param rejected",
    () => verifyServerFetchSeam(badCredParam, syntheticPath),
    "must not accept a credential parameter",
  );

  process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) {
    process.exitCode = 1;
    throw new Error(`${failed} self-test checks failed`);
  }
  process.stdout.write("✓ verify:server-data-seam detection logic bites on known violations\n");
  process.stdout.write("NOTE: build-artifact checks (.next/BUILD_ID, app-paths-manifest.json) require a production\n");
  process.stdout.write("      Next.js build and cannot be exercised without one. Those checks run in the main gate.\n");
}

if (process.argv.includes("--self-test")) {
  try {
    await selfTest();
  } catch (err) {
    process.stderr.write(`${err?.message ?? err}\n`);
    process.exitCode = 1;
  }
  process.exit(process.exitCode ?? 0);
}

const serverFetch = await read(path.join(frontendRoot, "lib", "server-fetch.ts"));
sourceHas(serverFetch, 'import "server-only"', path.join(frontendRoot, "lib", "server-fetch.ts"));
sourceHas(serverFetch, "export async function serverGet", path.join(frontendRoot, "lib", "server-fetch.ts"));
verifyServerFetchSeam(serverFetch, path.join(frontendRoot, "lib", "server-fetch.ts"));
sourceHas(serverFetch, 'headers.set("Authorization", `Bearer ${token}`)', path.join(frontendRoot, "lib", "server-fetch.ts"));
sourceHas(serverFetch, 'cache: "no-store"', path.join(frontendRoot, "lib", "server-fetch.ts"));
sourceHas(serverFetch, "AbortSignal.timeout(TIMEOUT_MS)", path.join(frontendRoot, "lib", "server-fetch.ts"));

const authenticatedLayoutPath = path.join(sourceRoot, "(authenticated)", "layout.tsx");
const authenticatedLayout = await read(authenticatedLayoutPath);
const accessReadIndex = authenticatedLayout.indexOf("await getServerAccess()");
const accessPrefetchIndex = authenticatedLayout.indexOf("await prefetchAccess()");
const accessBoundaryIndex = authenticatedLayout.indexOf("<HydrationBoundary state={state}>");
assert(accessReadIndex >= 0, "authenticated layout must enforce the server access snapshot");
assert(accessPrefetchIndex > accessReadIndex, "authenticated layout must prefetch access after its server gate");
assert(accessBoundaryIndex > accessPrefetchIndex, "authenticated shell must hydrate the access snapshot");

const accessPrefetchPath = path.join(prefetchRoot, "access.ts");
const accessPrefetch = await read(accessPrefetchPath);
const accessSourcePath = path.join(frontendRoot, "lib", "rbac", "get-server-access.ts");
const accessSource = await read(accessSourcePath);
sourceHas(accessPrefetch, "createServerQueryClient", accessPrefetchPath);
// The /me/access read moved behind getServerAccessResult() so the layout's gate and
// this prefetch share one cached request instead of issuing two. What must hold is
// that the snapshot still comes from the server seam and still degrades to an empty
// cache — asserted across both files rather than as one file's old call spelling.
assert(
  accessPrefetch.includes("getServerAccessResult") || accessPrefetch.includes('serverGet("/me/access"'),
  `${path.relative(frontendRoot, accessPrefetchPath)} must source the access snapshot from the server seam (getServerAccessResult or serverGet("/me/access"))`,
);
assert(
  /\bcatch\b|!\s*result\.ok/.test(accessPrefetch),
  `${path.relative(frontendRoot, accessPrefetchPath)} must degrade to an empty dehydrated cache instead of throwing the shell`,
);
sourceHas(accessSource, 'serverGet("/me/access"', accessSourcePath);
sourceHas(accessSource, 'from "react"', accessSourcePath);
sourceHas(accessSource, "cache(", accessSourcePath);
sourceHas(accessSource, "catch", accessSourcePath);

const prefetchSources = new Map();
for (const route of authenticatedRoutes) {
  const source = await read(route.source);
  const prefetch = prefetchSources.get(route.prefetch) ?? await read(route.prefetch);
  const hydrationTest = await read(route.hydrationTest);
  prefetchSources.set(route.prefetch, prefetch);

  const prefetchName = source.match(/await (prefetch[A-Za-z0-9_]*)\(/)?.[1];
  assert(prefetchName, `${route.name} must await a named prefetch factory`);
  const positions = callPositions(source, route.source, ["requirePermission", prefetchName]);
  const permissionIndex = positions.get("requirePermission")?.[0] ?? -1;
  const prefetchIndex = positions.get(prefetchName)?.[0] ?? -1;
  const boundaryIndex = source.lastIndexOf("<HydrationBoundary");
  assert(permissionIndex >= 0, `${route.name} must gate with requirePermission`);
  assert(prefetchIndex > permissionIndex, `${route.name} must prefetch after its permission gate`);
  assert(boundaryIndex > prefetchIndex, `${route.name} must hydrate the prefetched state`);
  sourceHas(source, "@/lib/prefetch/", route.source);
  sourceHas(prefetch, 'import "server-only"', route.prefetch);
  sourceHas(prefetch, "createServerQueryClient", route.prefetch);
  sourceHas(prefetch, "serverGet", route.prefetch);
  sourceHas(prefetch, "dehydrate", route.prefetch);
  sourceHas(hydrationTest, "renders rows from the hydrated cache", route.hydrationTest);
  sourceHas(hydrationTest, "not.toHaveBeenCalled", route.hydrationTest);
  sourceHas(hydrationTest, "fetches from the API when HydrationBoundary carries no cache", route.hydrationTest);
}

for (const file of publicRoutes) {
  const source = await read(file);
  sourceHas(source, "publicGet", file);
  assert(!source.includes("serverGet"), `${path.relative(frontendRoot, file)} must not use serverGet`);
  assert(!source.includes("HydrationBoundary"), `${path.relative(frontendRoot, file)} must remain separate from authenticated hydration`);
  assert(!source.includes("prefetch"), `${path.relative(frontendRoot, file)} must not use an authenticated prefetch helper`);
}

const publicFetch = await read(path.join(frontendRoot, "lib", "public-fetch.ts"));
sourceHas(publicFetch, "export async function publicGet", path.join(frontendRoot, "lib", "public-fetch.ts"));
sourceHas(publicFetch, "PUBLIC_REVALIDATE_SECS", path.join(frontendRoot, "lib", "public-fetch.ts"));
assert(!publicFetch.includes("Authorization"), "publicGet must not send an authenticated Authorization header");

const publicHtmlTestPath = path.join(frontendRoot, "lib", "prefetch", "public-help-first-html.test.tsx");
const publicHtmlTest = await read(publicHtmlTestPath);
sourceHas(publicHtmlTest, "renders landing data into the first server HTML", publicHtmlTestPath);
sourceHas(publicHtmlTest, "renders article data into the first server HTML", publicHtmlTestPath);

const buildIdPath = path.join(buildRoot, "BUILD_ID");
const appManifestPath = path.join(buildRoot, "server", "app-paths-manifest.json");
await access(buildIdPath);
await access(appManifestPath);
const buildId = (await read(buildIdPath)).trim();
assert(buildId.length > 0, "Next production build must have a non-empty BUILD_ID");
const appManifest = JSON.parse(await read(appManifestPath));
const builtRoutes = new Set(Object.keys(appManifest));

const requiredBuiltRoutes = [
  ...authenticatedRoutes.map(({ source }) =>
    source
      .replace(`${sourceRoot}${path.sep}`, "")
      .replaceAll(path.sep, "/")
      .replace(/\/page\.tsx$/, "")
      .replaceAll("(authenticated)", "(authenticated)"),
  ),
  ...publicRoutes.map((source) =>
    source
      .replace(`${sourceRoot}${path.sep}`, "")
      .replaceAll(path.sep, "/")
      .replace(/\/page\.tsx$/, "")
      .replaceAll("(public)", "(public)"),
  ),
].map((route) => `/${route}/page`);

for (const route of requiredBuiltRoutes) {
  assert(builtRoutes.has(route), `successful Next build must contain ${route}`);
}

console.log(`server-data seam verified: ${authenticatedRoutes.length} authenticated routes, ${publicRoutes.length} public routes, build ${buildId}`);
