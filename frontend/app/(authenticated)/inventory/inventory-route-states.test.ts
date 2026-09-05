import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname, relative } from "node:path";

/**
 * G8 — every inventory route answers all five questions.
 *
 * A route can be wrong in five ways and only one of them is visible in a
 * screenshot of the happy path:
 *
 *   * **loading** — a spinner where a skeleton belongs, or nothing at all;
 *   * **empty** — a hand-rolled centred `<div>` instead of `EmptyState`;
 *   * **error** — a failure that renders as "no data", which sends the reader
 *     to look for rows that exist;
 *   * **denied** — the one this programme keeps finding. A query gated by
 *     `useCan` with no denied branch renders the *empty* state to somebody who
 *     simply lacks the permission, so "you may not see this" and "there is
 *     nothing here" become the same screen. That is the defect A6 was raised
 *     for and it has come back more than once;
 *   * **success** — the only one anybody checks by hand.
 *
 * Auditing that by eye across 67 routes is a thing you do once and never again.
 * This does it on every run, which is the only version that keeps being true.
 *
 * **What it can and cannot see.** It follows a route's `page.tsx` into the
 * client component it renders and reads that file, which is where the states
 * actually live in this codebase — a page composes, a client implements. It
 * cannot follow two hops, and it cannot tell a *good* skeleton from a bad one.
 * So it is a floor, not a ceiling: passing means every route has an answer for
 * each question, not that the answer is well designed.
 */

const ROUTES_DIR = __dirname;
const FRONTEND_ROOT = join(__dirname, "..", "..", "..");

/** How each state is expressed in this codebase. Any one of these counts. */
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

/**
 * Routes with no data of their own.
 *
 * A hub that renders links, or a layout, has no loading, empty or error state to
 * show because it never asks a question. Listing them explicitly — rather than
 * letting the check quietly pass anything it cannot parse — is what stops the
 * exemption growing to cover a route that really is missing its states.
 */
const NO_DATA_ROUTES = new Set<string>([
  // The module hub renders links, not data.
  "inventory",
  // T09. The reports hub over the seven leaf reports. It renders links derived
  // from the navigation model and asks the server nothing of its own, so it has
  // no collection that could be empty. It still owes — and answers — loading,
  // error and denied, because deciding which cards to show is itself a read of
  // `/me/access`.
  "inventory/reports",
  // T09. `/inventory/pick-lists` is an alias, not a screen: its whole body is a
  // `redirect()` to `/inventory/operations/picking`, which `inventory.md:1358`
  // names as the pick-list surface. It renders nothing, so it has no state to
  // show; giving it four would be four branches that can never execute.
  "inventory/pick-lists",
  // A settings form has no collection, so it has no empty state — the same
  // argument as a `/new` route. It still owes loading, error and denied.
  "inventory/settings",
  // Module access is one shared surface every module renders; its states belong
  // to `features/module-access/`, and inventory neither owns nor may change them.
  "inventory/access",
]);

/**
 * A creation form has no empty state, because it has no collection.
 *
 * `/new` renders one blank record. "There is nothing here" is not a thing it can
 * truthfully say, and inventing an EmptyState to satisfy a checker would be
 * putting a component on screen to make a test pass. It still owes loading,
 * error and denied — a form saves, and saving can fail or be refused.
 */
function ownsACollection(routeRel: string): boolean {
  return !routeRel.endsWith("/new");
}

/**
 * Routes another session is mid-change on (B2 scan shell, B10 operations/SLA).
 *
 * Named rather than silently skipped: an exemption nobody can see is how a
 * checker stops checking. Each of these is a real gap, reported to the session
 * that owns the route, and this list is meant to reach zero.
 */
const IN_FLIGHT_ELSEWHERE = new Set<string>([]);

/**
 * Segments that must own an `error.tsx` of their own.
 *
 * The `error` marker above is satisfied by an in-component `ErrorState` or
 * `isError` branch, which answers a *fetch* failure. A render throw is a
 * different failure with a different mechanism: React unwinds to the nearest
 * segment boundary, and if inventory owns none the unwind reaches
 * `app/(authenticated)/error.tsx` and replaces the module with a generic page.
 * The operator keeps the nav rail and loses everything else — including any
 * sense of which screen failed. So the boundary is required, not inferred.
 *
 * Two entries, not eighty-two. Next.js resolves the nearest ancestor, so the
 * module root covers the tree; a per-route boundary only earns its place where
 * the recovery genuinely differs. RF is that place: it is a 375px handheld
 * surface, and recovering it through the desktop `PageWrapper` shell is the
 * exact regression `rf-surface.test.ts` exists to prevent.
 */
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

/**
 * Routes allowed to ship without a segment `loading.tsx`.
 *
 * One entry, and meant to stay near zero. It exists because the alternative to a
 * named exemption is an unnamed one: this column drifted to eight missing files
 * precisely because the ratchet *read* `loading.tsx` when it happened to be
 * there and never required it, so the in-component `isLoading` marker answered
 * for the segment fallback — which it cannot, being a different mechanism. A
 * route with no `loading.tsx` has no Suspense boundary for the segment, so a
 * slow server render shows the previous screen rather than a skeleton.
 *
 * Anything added here carries a written reason, the way `NO_DATA_ROUTES` does.
 * "It was easier" is not one. The bar the single entry below clears: the route
 * cannot render at all, so a `loading.tsx` beside it is not a thin skeleton but
 * a fallback for a screen that does not exist.
 */
const LOADING_EXEMPT_ROUTES: ReadonlyArray<{ route: string; reason: string }> = [
  {
    route: "inventory/pick-lists",
    reason:
      "The route's whole body is redirect() to /inventory/operations/picking, so it never renders. A segment fallback here could only flash the skeleton of a screen that does not exist, which is a file added to satisfy a checker rather than a reader.",
  },
];

/** The `(authenticated)` slash-path for a discovered route directory. */
function routePath(routeDir: string): string {
  return relative(join(FRONTEND_ROOT, "app", "(authenticated)"), routeDir).replace(/\\/g, "/");
}

/**
 * The segment boundary a render throw in `routeDir` would actually unwind to.
 *
 * Walks the segment chain the way Next.js does and stops at the inventory root:
 * a route whose nearest boundary lives *above* inventory is exactly the defect
 * — it resolves, but to somebody else's error page.
 */
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

/**
 * A route's source: its `page.tsx` plus the client component it renders.
 *
 * Pages in this codebase compose and do not implement (frontend §3), so reading
 * only `page.tsx` would report every route as missing everything.
 */
/**
 * Resolves an import specifier to source, aliased or relative.
 *
 * Relative imports matter as much as aliased ones and were missed at first: a
 * detail client pulls in its own tables with `./lot-stock-table`, and those
 * tables own the empty state for the collection they render. Reading only `@/`
 * imports reported both lot and serial detail pages as having no empty state
 * when they have had one all along — a false positive, which is the failure mode
 * that gets a checker switched off.
 */
function resolveModule(specifier: string, fromDir: string): string | null {
  const base = specifier.startsWith("@/")
    ? join(FRONTEND_ROOT, specifier.slice(2))
    : specifier.startsWith(".")
      ? join(fromDir, specifier)
      : null;
  if (base === null) return null;
  for (const candidate of [`${base}.tsx`, `${base}.ts`, join(base, "index.tsx")]) {
    if (existsSync(candidate)) return readFileSync(candidate, "utf8");
  }
  return null;
}

/**
 * Two hops, not one.
 *
 * A page composes a client, and a *detail* client composes its own tables — the
 * movements table on a lot page owns that table's empty state, and stopping at
 * one hop reported those pages as stateless when they were not. Two hops covers
 * every shape in this tree; it is deliberately not a full module graph, because
 * a checker that resolves everything ends up reading half the app and passing on
 * a marker that lives somewhere irrelevant.
 */
const MAX_HOPS = 2;

function routeSource(routeDir: string): string {
  const pagePath = join(routeDir, "page.tsx");
  let source = readFileSync(pagePath, "utf8");

  for (const dir of [routeDir, dirname(pagePath)]) {
    const loading = join(dir, "loading.tsx");
    if (existsSync(loading)) source += "\n" + readFileSync(loading, "utf8");
  }

  const seen = new Set<string>();
  let frontier: Array<{ text: string; dir: string }> = [{ text: source, dir: routeDir }];
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
        const text2 = resolveModule(specifier, dir);
        if (text2 === null) continue;
        source += "\n" + text2;
        next.push({ text: text2, dir: dirname(resolvedFrom) });
      }
    }
    frontier = next;
  }
  return source;
}

/**
 * Comments are prose, not code.
 *
 * The first version matched raw text, and `components/ui/content-fill-panel.tsx`
 * mentions `EmptyState` in a comment — so every route that imported it scored
 * `empty` for free, and `/inventory/barcode` passed the check without having an
 * empty state at all. A substring walk that reads prose is a checker that
 * approves documentation.
 *
 * The same fix the D5 float ratchet needed, for the same reason. String literals
 * cannot smuggle a marker past this: a `//` inside one is a URL.
 */
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

describe("G8 — inventory routes answer all five states", () => {
  const routes = routeDirs(ROUTES_DIR);

  it("finds the inventory routes at all, so a broken walk cannot pass silently", () => {
    // A scan that returns nothing reports zero violations, which reads exactly
    // like success. This is the guard on the guard.
    expect(routes.length).toBeGreaterThan(40);
  });

  it("reads code and not prose, so a marker in a comment cannot pass a route", () => {
    // The hole this closes was real: `components/ui/content-fill-panel.tsx`
    // mentions EmptyState in a comment, and the two-hop walk pulls that file in,
    // so every route importing it scored `empty` for free. /inventory/barcode
    // passed the check without having an empty state at all.
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
    // And it still sees the real thing.
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
    // The guard on the guard, restated here: a walk that finds nothing reports
    // zero uncovered routes, which reads exactly like full coverage.
    expect(routes.length).toBeGreaterThan(40);

    const uncovered = routes
      .filter((routeDir) => nearestErrorBoundary(routeDir) === null)
      .map(routePath);

    expect(uncovered).toEqual([]);
  });

  it("gives every inventory route with a page.tsx its own segment loading.tsx", () => {
    // The guard on the guard again: a walk that finds nothing reports zero
    // missing files, which is indistinguishable from a complete column.
    expect(routes.length).toBeGreaterThan(40);

    const exempt = new Set(LOADING_EXEMPT_ROUTES.map(({ route }) => route));
    const missing = routes
      .map(routePath)
      .filter((rel) => !exempt.has(rel))
      .filter((rel) =>
        !existsSync(join(FRONTEND_ROOT, "app", "(authenticated)", rel, "loading.tsx")),
      );

    expect(missing).toEqual([]);
  });

  it("keeps the loading exemptions pointing at routes that still exist", () => {
    // An exemption for a route that has been deleted or renamed is a hole
    // nobody can see: it silences nothing today and silences the wrong thing
    // tomorrow, when a new route happens to take the name.
    const known = new Set(routes.map(routePath));
    const stale = LOADING_EXEMPT_ROUTES.filter(({ route }) => !known.has(route)).map(
      ({ route, reason }) => `${route} — ${reason}`,
    );

    expect(stale).toEqual([]);
  });

  it("keeps each named segment owning its own boundary", () => {
    const missing = OWN_ERROR_BOUNDARY.filter(
      ({ route }) =>
        !existsSync(join(FRONTEND_ROOT, "app", "(authenticated)", route, "error.tsx")),
    ).map(({ route, reason }) => `${route} — ${reason}`);

    expect(missing).toEqual([]);
  });

  it("recovers the RF surface through the RF boundary, not the desktop one", () => {
    // Deleting `rf/error.tsx` still leaves every RF route *covered* — by the
    // module boundary, which renders a PageWrapper. That is a silent downgrade
    // to a desktop shell on a scanner, so it is asserted separately from
    // coverage rather than folded into it.
    const rfRoot = join(ROUTES_DIR, "rf");
    const rfRoutes = routes.filter((routeDir) => routeDir.startsWith(rfRoot));
    expect(rfRoutes.length).toBeGreaterThan(0);

    const escaped = rfRoutes
      .filter((routeDir) => nearestErrorBoundary(routeDir) !== rfRoot)
      .map(routePath);

    expect(escaped).toEqual([]);
  });

  it("never lets denied collapse into empty on a route that gates a query", () => {
    // The narrower half of the rule above, stated separately because it is the
    // one that keeps regressing: a route that calls `useCan` has decided some
    // people may not see it, and it therefore owes them a different answer from
    // "there is nothing here".
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
        // A server page's denied answer is the redirect `requirePermission`
        // performs before anything renders — there is no client branch to write,
        // and demanding one would mean rendering a page in order to say it may
        // not be rendered.
        source.includes("await requirePermission(");
      if (!hasDeniedSurface) offenders.push(rel);
    }

    expect(offenders).toEqual([]);
  });
});
