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

const serverFetch = await read(path.join(frontendRoot, "lib", "server-fetch.ts"));
sourceHas(serverFetch, 'import "server-only"', path.join(frontendRoot, "lib", "server-fetch.ts"));
sourceHas(serverFetch, "export async function serverGet", path.join(frontendRoot, "lib", "server-fetch.ts"));
sourceHas(serverFetch, "cache(async <T>(token: string, path: string)", path.join(frontendRoot, "lib", "server-fetch.ts"));
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
sourceHas(accessPrefetch, "createServerQueryClient", accessPrefetchPath);
sourceHas(accessPrefetch, "serverGet<AccessResponse>(\"/me/access\")", accessPrefetchPath);
sourceHas(accessPrefetch, "catch", accessPrefetchPath);

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
