import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname, relative } from "node:path";


const ROUTES_DIR = __dirname;
const FRONTEND_ROOT = join(__dirname, "..", "..", "..");

const STATE_MARKERS = {
  loading: [
    "isLoading",
    "isPending",
    "Skeleton",
    "DataTableSkeleton",
    "StatCardGridSkeleton",
    "KanbanBoardSkeleton",
  ],
  empty: ["EmptyState", "InventoryEmptyState", "emptyState"],
  error: ["ErrorState", "isError", "getErrorMessage"],
  denied: ["NoPermissionState", "AccessDenied", "useCan", "requirePermission", "RequireModule"],
} as const;

type StateName = keyof typeof STATE_MARKERS;

const NO_DATA_ROUTES = new Set<string>([
  "inventory",
  "inventory/reports",
  "inventory/settings",
  "inventory/access",
]);

function ownsACollection(routeRel: string): boolean {
  return !routeRel.endsWith("/new");
}

const IN_FLIGHT_ELSEWHERE = new Set<string>([]);

const OWN_ERROR_BOUNDARY: ReadonlyArray<{ route: string; reason: string }> = [
  {
    route: "inventory",
    reason: "The module boundary. Without it a render throw anywhere under /inventory replaces the whole authenticated shell.",
  },
  {
    route: "inventory/rf",
    reason: "A handheld cannot recover through a desktop page shell; RF keeps its own one-column, one-action surface.",
  },
];


const A11Y_SUITE = join(ROUTES_DIR, "inventory-a11y.test.tsx");

const A11Y_MIN_ROUTE_SURFACES = 6;
const A11Y_MIN_SHARED_SURFACES = 5;

const WRITE_MARKERS = ["useMutation", "mutateAsync", ".mutate("] as const;
const SUCCESS_MARKERS = ["toast.success", "toast.promise", "onSuccess"] as const;

const SUCCESS_EXEMPT_ROUTES: ReadonlyArray<{ route: string; reason: string }> = [
  {
    route: "inventory/ai",
    reason:
      "Its three panels POST to read. inventory-copilot-panel.tsx says so in its own header — 'no button that writes — the copilot reads' — and demand-risk-panel.tsx's explain.mutate() asks for an explanation. The answer arriving on screen is the confirmation; a toast saying 'asked successfully' would be noise over the actual result. anomaly-queue-panel.tsx's review.mutate() is a real write, and its receipt is the reviewed row leaving the queue.",
  },
  {
    route: "inventory/forecasting",
    reason:
      "replenishment-simulator-sheet.tsx:110 simulate.mutate() requests a projection and nothing is persisted. The simulated numbers replacing the form are the success state.",
  },
  {
    route: "inventory/cycle-counts/[countId]",
    reason:
      "Five lifecycle transitions (start, review, post, cancel, update lines). cycle-count-detail-client.tsx:58 passes status={count?.status} to the shell, so the badge and the available actions both change on success — a toast would restate what the screen already shows.",
  },
  {
    route: "inventory/physical-audits/[auditId]",
    reason:
      "The same shape as the cycle count above; physical-audit-detail-client.tsx:58 passes status={audit?.status} through to the shell.",
  },
  {
    route: "inventory/lots/[lotId]",
    reason:
      "One transition, ACTIVE <-> BLOCKED. lot-detail-client.tsx:112 renders badge={LOT_STATUS_LABEL[lot.status]} and :123 swaps the action label with it, so the control the operator just used changes under their finger.",
  },
];

const DEVICE_WIDTH = 375;
const PINNED_WIDTH = /(?<![a-z-])(sm:|md:|lg:|xl:|2xl:)?(?:min-)?w-\[(\d+)px\]/g;
const HORIZONTAL_SCROLL = /overflow-x-(?:auto|scroll)/;

const PINNED_WIDTH_EXEMPT_FILES: ReadonlyArray<{ file: string; reason: string }> = [
  {
    file: "features/inventory/components/replenishment/transfer-evidence-panel.tsx",
    reason:
      "min-w-[560px] on the evidence table at :56, directly inside the overflow-x-auto at :55. Seven columns of transfer evidence a planner reads at a desk; scrolling it sideways on a phone is worse than not shipping it, and better than dropping the columns that justify the recommendation.",
  },
  {
    file: "features/inventory/components/replenishment/po-batch-preview-panel.tsx",
    reason:
      "min-w-[520px] at :59 inside the overflow-x-auto at :58. The batch a buyer is about to raise; the same argument.",
  },
  {
    file: "features/inventory/components/replenishment/forecast-drift-evidence-sheet.tsx",
    reason:
      "min-w-[420px] at :145 inside the overflow-x-auto at :144. Drift evidence in a sheet, opened from a desktop analyst screen.",
  },
];

function namedListValues(source: string, constName: string, key: string): string[] {
  const start = source.indexOf(`const ${constName}`);
  if (start === -1) return [];
  const end = source.indexOf("\n];", start);
  if (end === -1) return [];
  return [...source.slice(start, end).matchAll(new RegExp(`${key}:\\s*"([^"]+)"`, "g"))]
    .map((match) => match[1] ?? "")
    .filter((value) => value.length > 0);
}

function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function pinnedWidths(file: RouteFile): Array<{ className: string; line: number }> {
  const found: Array<{ className: string; line: number }> = [];
  const stripped = stripComments(file.text).split("\n");
  for (const [index, line] of stripped.entries()) {
    for (const match of line.matchAll(PINNED_WIDTH)) {
      if (match[1]) continue;
      if (Number(match[2]) <= DEVICE_WIDTH) continue;
      found.push({ className: match[0], line: index + 1 });
    }
  }
  return found;
}

function routePath(routeDir: string): string {
  return relative(join(FRONTEND_ROOT, "app", "(authenticated)"), routeDir).replace(/\\/g, "/");
}

function nearestErrorBoundary(routeDir: string): string | null {
  let dir = routeDir;
  for (;;) {
    if (existsSync(join(dir, "error.tsx"))) return dir;
    if (dir === ROUTES_DIR) return null;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function routeDirs(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = join(dir, entry.name);
    if (existsSync(join(full, "page.tsx"))) acc.push(full);
    routeDirs(full, acc);
  }
  return acc;
}

interface RouteFile {
  path: string;
  text: string;
}

function resolveModule(specifier: string, fromDir: string): RouteFile | null {
  const base = specifier.startsWith("@/")
    ? join(FRONTEND_ROOT, specifier.slice(2))
    : specifier.startsWith(".")
      ? join(fromDir, specifier)
      : null;
  if (base === null) return null;
  for (const candidate of [`${base}.tsx`, `${base}.ts`, join(base, "index.tsx")]) {
    if (existsSync(candidate)) return { path: candidate, text: readFileSync(candidate, "utf8") };
  }
  return null;
}

const MAX_HOPS = 2;

function routeFiles(routeDir: string): RouteFile[] {
  const pagePath = join(routeDir, "page.tsx");
  const files: RouteFile[] = [{ path: pagePath, text: readFileSync(pagePath, "utf8") }];

  const loading = join(routeDir, "loading.tsx");
  if (existsSync(loading)) files.push({ path: loading, text: readFileSync(loading, "utf8") });

  const seen = new Set<string>();
  let frontier: Array<{ text: string; dir: string }> = [
    { text: files.map((file) => file.text).join("\n"), dir: routeDir },
  ];
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const next: Array<{ text: string; dir: string }> = [];
    for (const { text, dir } of frontier) {
      for (const match of text.matchAll(
        /from\s+"((?:@\/(?:features|components)|\.\.?)\/[^"]+)"/g,
      )) {
        const specifier = match[1];
        if (!specifier) continue;
        const resolvedFrom = specifier.startsWith("@/")
          ? join(FRONTEND_ROOT, specifier.slice(2))
          : join(dir, specifier);
        if (seen.has(resolvedFrom)) continue;
        seen.add(resolvedFrom);
        const resolved = resolveModule(specifier, dir);
        if (resolved === null) continue;
        files.push(resolved);
        next.push({ text: resolved.text, dir: dirname(resolvedFrom) });
      }
    }
    frontier = next;
  }
  return files;
}

function routeSource(routeDir: string): string {
  return routeFiles(routeDir)
    .map((file) => file.text)
    .join("\n");
}

function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function missingStates(source: string): StateName[] {
  const stripped = code(source);
  return (Object.keys(STATE_MARKERS) as StateName[]).filter(
    (state) => !STATE_MARKERS[state].some((marker) => stripped.includes(marker)),
  );
}

describe("G8 — inventory routes answer the states PRD §12.7 requires", () => {
  const routes = routeDirs(ROUTES_DIR);

  it("finds the inventory routes at all, so a broken walk cannot pass silently", () => {
    expect(routes.length).toBeGreaterThan(40);
  });

  it("reads code and not prose, so a marker in a comment cannot pass a route", () => {
    expect(missingStates("// EmptyState ErrorState isLoading useCan")).toEqual([
      "loading",
      "empty",
      "error",
      "denied",
    ]);
    expect(missingStates("/* EmptyState ErrorState isLoading useCan */")).toEqual([
      "loading",
      "empty",
      "error",
      "denied",
    ]);
    expect(missingStates("<EmptyState /> <ErrorState /> isLoading useCan(")).toEqual([]);
  });

  it("gives every route a loading, empty, error and denied answer", () => {
    const offenders: string[] = [];

    for (const routeDir of routes) {
      const rel = relative(join(FRONTEND_ROOT, "app", "(authenticated)"), routeDir).replace(
        /\\/g,
        "/",
      );
      if (NO_DATA_ROUTES.has(rel) || IN_FLIGHT_ELSEWHERE.has(rel)) continue;

      const missing = missingStates(routeSource(routeDir)).filter(
        (state) => state !== "empty" || ownsACollection(rel),
      );
      if (missing.length > 0) offenders.push(`${rel} — missing: ${missing.join(", ")}`);
    }

    expect(offenders).toEqual([]);
  });

  it("gives every inventory route a segment error.tsx inside inventory", () => {
    expect(routes.length).toBeGreaterThan(40);

    const uncovered = routes
      .filter((routeDir) => nearestErrorBoundary(routeDir) === null)
      .map(routePath);

    expect(uncovered).toEqual([]);
  });

  it("gives every inventory route with a page.tsx its own segment loading.tsx", () => {
    expect(routes.length).toBeGreaterThan(40);

    const missing = routes
      .map(routePath)
      .filter((rel) =>
        !existsSync(join(FRONTEND_ROOT, "app", "(authenticated)", rel, "loading.tsx")),
      );

    expect(missing).toEqual([]);
  });

  it("keeps each named segment owning its own boundary", () => {
    const missing = OWN_ERROR_BOUNDARY.filter(
      ({ route }) =>
        !existsSync(join(FRONTEND_ROOT, "app", "(authenticated)", route, "error.tsx")),
    ).map(({ route, reason }) => `${route} — ${reason}`);

    expect(missing).toEqual([]);
  });

  it("recovers the RF surface through the RF boundary, not the desktop one", () => {
    const rfRoot = join(ROUTES_DIR, "rf");
    const rfRoutes = routes.filter((routeDir) => routeDir.startsWith(rfRoot));
    expect(rfRoutes.length).toBeGreaterThan(0);

    const escaped = rfRoutes
      .filter((routeDir) => nearestErrorBoundary(routeDir) !== rfRoot)
      .map(routePath);

    expect(escaped).toEqual([]);
  });

  it("never lets denied collapse into empty on a route that gates a query", () => {
    const offenders: string[] = [];

    for (const routeDir of routes) {
      const rel = relative(join(FRONTEND_ROOT, "app", "(authenticated)"), routeDir).replace(
        /\\/g,
        "/",
      );
      if (IN_FLIGHT_ELSEWHERE.has(rel)) continue;
      const source = code(routeSource(routeDir));
      const gatesAQuery = source.includes("useCan(") || source.includes("requirePermission");
      if (!gatesAQuery) continue;

      const hasDeniedSurface =
        source.includes("NoPermissionState") ||
        source.includes("AccessDenied") ||
        source.includes("RequireModule") ||
        source.includes("await requirePermission(");
      if (!hasDeniedSurface) offenders.push(rel);
    }

    expect(offenders).toEqual([]);
  });


  it("keeps inventory covered by a suite that actually runs axe", () => {
    expect(routes.length).toBeGreaterThan(40);
    expect(existsSync(A11Y_SUITE)).toBe(true);

    const suite = readFileSync(A11Y_SUITE, "utf8");
    const covered = namedListValues(suite, "A11Y_COVERED_ROUTES", "route");
    const shared = namedListValues(suite, "A11Y_COVERED_SHARED", "file");

    expect(covered.length).toBeGreaterThanOrEqual(A11Y_MIN_ROUTE_SURFACES);
    expect(shared.length).toBeGreaterThanOrEqual(A11Y_MIN_SHARED_SURFACES);

    expect(suite).toContain("axeRunCount");
    expect(suite).toContain("afterAll(");
    expect(suite).toMatch(/expect\(axeRunCount\)\.toBeGreaterThanOrEqual\(promised\)/);

    expect(suite).toContain('from "@/test-utils/axe"');
  });

  it("keeps the a11y coverage list pointing at routes and files that still exist", () => {
    const suite = readFileSync(A11Y_SUITE, "utf8");

    const staleRoutes = namedListValues(suite, "A11Y_COVERED_ROUTES", "route").filter(
      (route) =>
        !existsSync(join(FRONTEND_ROOT, "app", "(authenticated)", route, "page.tsx")),
    );
    const staleFiles = namedListValues(suite, "A11Y_COVERED_SHARED", "file").filter(
      (file) => !existsSync(join(FRONTEND_ROOT, file)),
    );

    expect({ staleRoutes, staleFiles }).toEqual({ staleRoutes: [], staleFiles: [] });
  });

  it("tells the reader a write landed on every route that writes", () => {
    const exempt = new Set(SUCCESS_EXEMPT_ROUTES.map(({ route }) => route));
    const offenders: string[] = [];
    let writingRoutes = 0;

    for (const routeDir of routes) {
      const rel = routePath(routeDir);
      if (IN_FLIGHT_ELSEWHERE.has(rel)) continue;
      const source = code(routeSource(routeDir));
      if (!WRITE_MARKERS.some((marker) => source.includes(marker))) continue;
      writingRoutes++;
      if (exempt.has(rel)) continue;
      if (!SUCCESS_MARKERS.some((marker) => source.includes(marker))) offenders.push(rel);
    }

    expect(writingRoutes).toBeGreaterThan(40);
    expect(offenders).toEqual([]);
  });

  it("keeps the success exemptions pointing at routes that still write", () => {
    const known = new Set(routes.map(routePath));
    const byPath = new Map(routes.map((routeDir) => [routePath(routeDir), routeDir]));

    const stale = SUCCESS_EXEMPT_ROUTES.filter(({ route }) => {
      if (!known.has(route)) return true;
      const routeDir = byPath.get(route);
      if (routeDir === undefined) return true;
      return !WRITE_MARKERS.some((marker) => code(routeSource(routeDir)).includes(marker));
    }).map(({ route }) => route);

    expect(stale).toEqual([]);
    for (const { reason } of SUCCESS_EXEMPT_ROUTES)
      expect(reason.length).toBeGreaterThan(80);
  });

  it("never pins an inventory route wider than the device it has to fit", () => {
    expect(routes.length).toBeGreaterThan(40);

    const exempt = new Set(PINNED_WIDTH_EXEMPT_FILES.map(({ file }) => file));
    const offenders = new Set<string>();

    for (const routeDir of routes) {
      for (const file of routeFiles(routeDir)) {
        const rel = relative(FRONTEND_ROOT, file.path).replace(/\\/g, "/");
        if (exempt.has(rel)) continue;
        for (const { className, line } of pinnedWidths(file))
          offenders.add(`${rel}:${line} — ${className} (device is ${DEVICE_WIDTH}px)`);
      }
    }

    expect([...offenders].sort()).toEqual([]);
  });

  it("earns each pinned-width exemption instead of granting it", () => {
    const unearned: string[] = [];

    for (const { file, reason } of PINNED_WIDTH_EXEMPT_FILES) {
      const path = join(FRONTEND_ROOT, file);
      if (!existsSync(path)) {
        unearned.push(`${file} — the file no longer exists`);
        continue;
      }
      const lines = stripComments(readFileSync(path, "utf8")).split("\n");
      const wide = pinnedWidths({ path, text: readFileSync(path, "utf8") });
      if (wide.length === 0) {
        unearned.push(`${file} — no longer pins anything past ${DEVICE_WIDTH}px, so the exemption is stale`);
        continue;
      }
      for (const { className, line } of wide) {
        const window = lines.slice(Math.max(0, line - 4), line).join("\n");
        if (!HORIZONTAL_SCROLL.test(window))
          unearned.push(`${file}:${line} — ${className} is not inside a horizontal scroll region`);
      }
      if (reason.length < 60) unearned.push(`${file} — the reason is a stub`);
    }

    expect(unearned).toEqual([]);
  });

});
