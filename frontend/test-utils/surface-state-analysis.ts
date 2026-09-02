import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";

const FE_ROOT = resolve(__dirname, "..");
const AUTHENTICATED_ROOT = join(FE_ROOT, "app", "(authenticated)");

const RESOLVE_EXTENSIONS = [".tsx", ".ts", "/index.tsx", "/index.ts"];

const PRIMITIVE_PREFIXES = [
  "components/ui/",
  "components/shared/",
  "components/illustrations/",
  "components/charts/",
  "components/layout/",
  "components/providers/",
  "lib/",
  "hooks/",
];

const IMPORT_PATTERN =
  /(?:^|\n)\s*(?:import[\s\S]*?from\s*|export[\s\S]*?from\s*)["']([^"']+)["']/g;
const DYNAMIC_IMPORT_PATTERN = /import\(\s*["']([^"']+)["']\s*\)/g;

interface SurfaceStates {
  route: string;
  pageModule: string;
  moduleCount: number;
  readsServerState: boolean;
  loading: boolean;
  empty: boolean;
  error: boolean;
  permissionDenied: boolean;
  pageLevelSpinner: boolean;
}

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

function resolveImport(specifier: string, fromFile: string): string | null {
  let base: string;
  if (specifier.startsWith("@/")) base = join(FE_ROOT, specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(fromFile), specifier);
  else return null;

  for (const extension of RESOLVE_EXTENSIONS) {
    const candidate = base + extension;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  if (existsSync(base) && statSync(base).isFile()) return base;
  return null;
}

function isPrimitive(file: string): boolean {
  const rel = relative(FE_ROOT, file);
  return PRIMITIVE_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

function isTestFile(file: string): boolean {
  return (
    file.includes("__tests__") ||
    file.endsWith(".test.ts") ||
    file.endsWith(".test.tsx")
  );
}

const sourceCache = new Map<string, string>();
function readSource(file: string): string {
  const cached = sourceCache.get(file);
  if (cached !== undefined) return cached;
  const source = readFileSync(file, "utf8");
  sourceCache.set(file, source);
  return source;
}

function ancestorLayouts(pageModule: string): string[] {
  const layouts: string[] = [];
  let dir = dirname(pageModule);
  for (;;) {
    const layout = join(dir, "layout.tsx");
    if (existsSync(layout)) layouts.push(layout);
    if (dir === AUTHENTICATED_ROOT) break;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return layouts;
}

function surfaceClosure(pageModule: string, maxModules = 120): string[] {
  const seen = new Set([pageModule]);
  const queue = [pageModule];
  const collected: string[] = [];

  while (queue.length > 0 && collected.length < maxModules) {
    const file = queue.shift() as string;
    collected.push(file);
    const source = readSource(file);
    const specifiers = new Set<string>();

    IMPORT_PATTERN.lastIndex = 0;
    let match = IMPORT_PATTERN.exec(source);
    while (match) {
      specifiers.add(match[1] as string);
      match = IMPORT_PATTERN.exec(source);
    }
    DYNAMIC_IMPORT_PATTERN.lastIndex = 0;
    match = DYNAMIC_IMPORT_PATTERN.exec(source);
    while (match) {
      specifiers.add(match[1] as string);
      match = DYNAMIC_IMPORT_PATTERN.exec(source);
    }

    for (const specifier of specifiers) {
      const resolved = resolveImport(specifier, file);
      if (resolved === null) continue;
      if (seen.has(resolved)) continue;
      if (!resolved.startsWith(FE_ROOT)) continue;
      if (isPrimitive(resolved) || isTestFile(resolved)) continue;
      seen.add(resolved);
      queue.push(resolved);
    }
  }

  return collected;
}

const SERVER_STATE_SIGNALS = [
  /\bisLoading\b/,
  /\bisError\b/,
  /useQuery|useGatedQuery|useInfiniteQuery|useSuspenseQuery/,
];
const LOADING_SIGNALS = [
  /\bSkeleton\b/,
  /\bLoadingState\b/,
  /DataTableSkeleton/,
  /StatCardGridSkeleton/,
  /KanbanBoardSkeleton/,
  /\bisLoading\b/,
];
const EMPTY_SIGNALS = [/\bEmptyState\b/, /emptyState[=:]/, /ChartEmptyState/];
const ERROR_SIGNALS = [/\bErrorState\b/, /\bisError\b/, /\bisApiError\b/];
const PERMISSION_SIGNALS = [
  /useCan\(/,
  /useAccess\(/,
  /NoPermissionState/,
  /RequireModule/,
  /AccessDenied/,
  /DashboardGate/,
  /EntitlementGate/,
  /useModuleEnabled/,
  /requirePermission\(/,
  /enforceRouteAccess\(/,
  /requireModulePermission\(/,
  /access=\{/,
];
const PAGE_SPINNER_SIGNAL = /animate-spin/;

function matches(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function routeOf(pageModule: string): string {
  const rel = relative(AUTHENTICATED_ROOT, dirname(pageModule)).replace(/\\/g, "/");
  return rel === "" ? "/" : `/${rel}`;
}

function analyzeAuthenticatedSurfaces(): SurfaceStates[] {
  const pages = walkFiles(AUTHENTICATED_ROOT).filter((file) =>
    file.endsWith(`${"/"}page.tsx`),
  );

  return pages.map((pageModule) => {
    const modules = surfaceClosure(pageModule);
    const text = modules.map(readSource).join("\n");
    const gateText = [text, ...ancestorLayouts(pageModule).map(readSource)].join("\n");
    return {
      route: routeOf(pageModule),
      pageModule: relative(FE_ROOT, pageModule),
      moduleCount: modules.length,
      readsServerState: matches(text, SERVER_STATE_SIGNALS),
      loading: matches(text, LOADING_SIGNALS),
      empty: matches(text, EMPTY_SIGNALS),
      error: matches(text, ERROR_SIGNALS),
      permissionDenied: matches(gateText, PERMISSION_SIGNALS),
      pageLevelSpinner: PAGE_SPINNER_SIGNAL.test(text),
    };
  });
}

function analyzeFilterEmptyConflation(): string[] {
  const skipDirectories = new Set([
    ".next",
    ".next-buildmart",
    "node_modules",
    ".git",
    ".scratch",
    "public",
  ]);

  function collect(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (skipDirectories.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) collect(full, out);
      else if (full.endsWith(".tsx") && !isTestFile(full)) out.push(full);
    }
    return out;
  }

  const filterSignals = [
    /useDebouncedValue/,
    /SearchInput/,
    /statusFilter/i,
    /useSearchParams/,
    /DateRangePicker/,
  ];

  return collect(FE_ROOT)
    .filter((file) => {
      const source = readSource(file);
      if (!/<EmptyState[\s/>]/.test(source)) return false;
      if (/filtersActive/.test(source)) return false;
      return filterSignals.some((pattern) => pattern.test(source));
    })
    .map((file) => relative(FE_ROOT, file));
}

interface SourceClassification {
  readsServerState: boolean;
  loading: boolean;
  empty: boolean;
  error: boolean;
  permissionDenied: boolean;
  pageLevelSpinner: boolean;
}

function classifySource(text: string): SourceClassification {
  return {
    readsServerState: matches(text, SERVER_STATE_SIGNALS),
    loading: matches(text, LOADING_SIGNALS),
    empty: matches(text, EMPTY_SIGNALS),
    error: matches(text, ERROR_SIGNALS),
    permissionDenied: matches(text, PERMISSION_SIGNALS),
    pageLevelSpinner: PAGE_SPINNER_SIGNAL.test(text),
  };
}

export {
  FE_ROOT,
  classifySource,
  analyzeAuthenticatedSurfaces,
  analyzeFilterEmptyConflation,
  surfaceClosure,
  routeOf,
};
export type { SurfaceStates, SourceClassification };
