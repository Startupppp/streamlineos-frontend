import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const FRONTEND_ROOT = resolve(__dirname, "..");
const AUTHENTICATED_ROOT = join(FRONTEND_ROOT, "app", "(authenticated)");

export interface HrmsRouteFiles {
  readonly route: string;
  readonly directory: string;
  readonly page: string;
  readonly loading: string | null;
  readonly layouts: readonly string[];
}

function layoutChain(routeDirectory: string): string[] {
  const layouts: string[] = [];
  let directory = routeDirectory;
  for (;;) {
    const layout = join(directory, "layout.tsx");
    if (existsSync(layout)) layouts.push(layout);
    if (directory === AUTHENTICATED_ROOT) return layouts;
    const parent = dirname(directory);
    if (parent === directory) return layouts;
    directory = parent;
  }
}

export function hrmsRouteFiles(route: string): HrmsRouteFiles {
  const directory = join(AUTHENTICATED_ROOT, ...route.split("/").filter(Boolean));
  const loading = join(directory, "loading.tsx");
  return {
    route,
    directory,
    page: join(directory, "page.tsx"),
    loading: existsSync(loading) ? loading : null,
    layouts: layoutChain(directory),
  };
}

const PAGE_WRAPPER_TITLE = /<PageWrapper\b[^>]*?\btitle="([^"]+)"/g;
const RETURNED_COMPONENT = /return\s*\(?\s*<([A-Z][A-Za-z0-9]*)\b/;
const REDIRECT_CALL = /\bredirect\(\s*"([^"]+)"\s*\)/;

function soleStaticTitle(source: string): string | null {
  const titles = new Set(
    [...source.matchAll(PAGE_WRAPPER_TITLE)].map((match) => match[1]),
  );
  if (titles.size !== 1) return null;
  return [...titles][0] ?? null;
}

function namedImportSource(source: string, name: string): string | null {
  const pattern = new RegExp(
    `import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*"([^"]+)"`,
  );
  return pattern.exec(source)?.[1] ?? null;
}

function barrelReexportSource(source: string, name: string): string | null {
  const pattern = new RegExp(
    `export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*"([^"]+)"`,
  );
  return pattern.exec(source)?.[1] ?? null;
}

function resolveModuleFile(fromFile: string, specifier: string): string | null {
  const base = specifier.startsWith("@/")
    ? join(FRONTEND_ROOT, specifier.slice(2))
    : resolve(dirname(fromFile), specifier);
  for (const candidate of [
    `${base}.tsx`,
    `${base}.ts`,
    join(base, "index.tsx"),
    join(base, "index.ts"),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function componentFile(fromFile: string, name: string, hops: number): string | null {
  if (hops === 0) return null;
  const source = readFileSync(fromFile, "utf8");
  const specifier =
    namedImportSource(source, name) ?? barrelReexportSource(source, name);
  if (!specifier) return null;
  const file = resolveModuleFile(fromFile, specifier);
  if (!file) return null;
  if (/[\\/]index\.tsx?$/.test(file)) return componentFile(file, name, hops - 1);
  return file;
}

export function declaredPageTitle(route: string): string | null {
  const { page } = hrmsRouteFiles(route);
  const source = readFileSync(page, "utf8");
  const direct = soleStaticTitle(source);
  if (direct) return direct;
  const returned = RETURNED_COMPONENT.exec(source)?.[1];
  if (!returned) return null;
  const feature = componentFile(page, returned, 3);
  if (!feature) return null;
  return soleStaticTitle(readFileSync(feature, "utf8"));
}

export function declaredRedirect(route: string): string | null {
  const { page } = hrmsRouteFiles(route);
  return REDIRECT_CALL.exec(readFileSync(page, "utf8"))?.[1] ?? null;
}

export function declaredLoadingTitle(route: string): string | null {
  const { loading } = hrmsRouteFiles(route);
  if (!loading) return null;
  return soleStaticTitle(readFileSync(loading, "utf8"));
}

export { AUTHENTICATED_ROOT as HRMS_AUTHENTICATED_ROOT };
