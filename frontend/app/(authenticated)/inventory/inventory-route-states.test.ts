import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname, relative } from "node:path";

/**
 * G8 — every inventory route answers PRD §12.7's questions.
 *
 * A route can be wrong in several ways and only one of them is visible in a
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
 *   * **success** — until T18, the only one anybody checked by hand. Now half
 *     of it is here (a route that writes has to say the write landed) and half
 *     is next door in `inventory-a11y.test.tsx`, which mounts loaded surfaces
 *     and looks for the rows, because "it renders the data" is not a question
 *     source can answer;
 *   * **mobile** — narrowly, and the T18 block below says exactly how narrowly:
 *     no class pins content wider than the device. Not "it fits";
 *   * **accessibility** — mounted and axe'd next door; what is held here is the
 *     count, so the suite cannot quietly go back to covering nothing.
 *
 * Auditing that by eye across 85 routes is a thing you do once and never again.
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

// ---------------------------------------------------------------------------
// T18 — the three §12.7 states nothing was holding.
//
// PRD §12.7 (`prd:719`) asks every route for seven: loading, empty, error,
// denied, success, mobile and accessibility. The four above were ratcheted by
// T07/T08 and the header of this file admitted the rest: "**success** — the only
// one anybody checks by hand." The three below close that, each as far as it can
// honestly go and no further.
// ---------------------------------------------------------------------------

/**
 * ACCESSIBILITY. The suite that mounts inventory surfaces and runs axe on them.
 *
 * `frontend/test-utils/axe.ts` had eleven users and not one was inventory, which
 * is the least defensible gap in the module: the harness was already wired, the
 * RF screens already mounted under jsdom, and 86 routes had no accessibility
 * assertion of any kind.
 *
 * What this holds is the *count*, not the assertions — those live next door in
 * `inventory-a11y.test.tsx`, which is where a mount belongs. What a count ratchet
 * is for is the failure mode a suite cannot catch about itself: being deleted,
 * or being quietly hollowed out until it mounts nothing. Both show up here.
 */
const A11Y_SUITE = join(ROUTES_DIR, "inventory-a11y.test.tsx");

/**
 * Floors, not exact counts.
 *
 * Adding a covered surface must not require editing this file — only a suite
 * that has stopped covering things should. Eleven is what T18 shipped; the
 * floors sit at that, so the next session may add and may not remove.
 */
const A11Y_MIN_ROUTE_SURFACES = 6;
const A11Y_MIN_SHARED_SURFACES = 5;

/**
 * SUCCESS. A route that writes has to tell the reader the write landed.
 *
 * "Renders something on the happy path" is not a checkable claim — every page
 * renders something, so a marker for it would pass on an empty div and teach
 * nobody anything. The checkable half of §12.7's success state is the one with a
 * failure mode: an operator taps Confirm, nothing visible changes, and they tap
 * again. So the question asked here is narrower and answerable — a route whose
 * UI tree performs a write must also carry, *in that same tree*, something that
 * happens when the write succeeds.
 *
 * `@/hooks` is deliberately outside the walk (see the import filter in
 * `routeFiles`), so an `onSuccess` inside a query hook cannot answer for a
 * screen. The marker has to be in the page, its client, or a component it
 * renders — which is where a visible confirmation would live.
 *
 * The other half of success — that a *loaded* surface actually shows its rows —
 * is not answerable from source at all and is asserted by mounting, in
 * `inventory-a11y.test.tsx`'s "T18 success" block.
 */
const WRITE_MARKERS = ["useMutation", "mutateAsync", ".mutate("] as const;
const SUCCESS_MARKERS = ["toast.success", "toast.promise", "onSuccess"] as const;

/**
 * Routes whose write is confirmed by something this check cannot see.
 *
 * Five, each verified against source before being written, and each naming the
 * mechanism so the claim can be checked rather than taken on trust. Two shapes:
 * a POST that is really a read, and a state machine whose badge is the receipt.
 */
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

/**
 * MOBILE — and what this is not.
 *
 * jsdom has no layout. "It fits at 375px" is not a sentence any assertion in
 * this repository can truthfully say, and a green tick would make it convincing
 * while it stayed untrue. `rf-surface-render.test.tsx` states the same refusal in
 * its own header, and the device run is issue #45, blocked on a credential.
 *
 * What *is* checkable in source is the narrower thing that actually breaks a
 * handheld: a class that pins content wider than the screen, which is a
 * horizontal scroll under another name. `max-w-[Npx]` is a cap and not a floor,
 * so it is excluded; a breakpoint prefix means the width only applies above that
 * breakpoint, so `sm:w-[480px]` is excluded too. What is left — an unprefixed
 * `w-[Npx]` or `min-w-[Npx]` wider than the device — is the real thing.
 *
 * Not covered, stated plainly so nobody reads a pass as more than it is: tap
 * target sizes, overlap, reflow, text scaling, whether a table degrades to cards,
 * anything measured in pixels at runtime, and every width expressed in a way this
 * regex does not see (a style attribute, a CSS file, a rem value, a grid template).
 */
const DEVICE_WIDTH = 375;
const PINNED_WIDTH = /(?<![a-z-])(sm:|md:|lg:|xl:|2xl:)?(?:min-)?w-\[(\d+)px\]/g;
const HORIZONTAL_SCROLL = /overflow-x-(?:auto|scroll)/;

/**
 * Files allowed to pin something wider than the device.
 *
 * Three, all the same shape: an evidence table inside an explicit
 * `overflow-x-auto` region on a desktop analyst surface. That is a horizontal
 * scroll on a phone and the reason says so — it is an accepted compromise, not
 * a claim that it is fine. It is not accepted anywhere near RF, which is why
 * `rf-surface.test.ts` bans `overflow-x-auto` outright on that surface.
 *
 * The exemption is *verified*, not granted: the guard below re-reads each file
 * and fails unless the wide class really does sit inside a horizontal scroll
 * region, within three lines of it. A proximity check is not DOM ancestry and
 * does not pretend to be — but it is the difference between an exemption that
 * states a fact and one that asserts a hope.
 */
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

/**
 * Reads the string values of one key out of a named array literal in a source file.
 *
 * This is how the a11y count ratchet sees the suite next door without importing
 * it — importing would run it, and a ratchet that has to run the thing it is
 * ratcheting cannot report on that thing being broken.
 */
function namedListValues(source: string, constName: string, key: string): string[] {
  const start = source.indexOf(`const ${constName}`);
  if (start === -1) return [];
  const end = source.indexOf("\n];", start);
  if (end === -1) return [];
  return [...source.slice(start, end).matchAll(new RegExp(`${key}:\\s*"([^"]+)"`, "g"))]
    .map((match) => match[1] ?? "")
    .filter((value) => value.length > 0);
}

/**
 * Strips comments while preserving line numbers, so an offender can be pointed at.
 *
 * `code()` below collapses block comments to a single space, which is right for a
 * substring check and wrong here — the line numbers in a failure message are how
 * somebody finds the class, and a comment three lines long would shift every
 * number after it. This blanks a block comment in place instead. Doing it at all
 * matters: a header that discusses `min-w-[900px]` in prose is exactly the shape
 * `rf-surface-render.test.tsx` has, and reading prose as code is how a checker
 * starts reporting documentation.
 */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** Unprefixed pinned widths past the device, per file, with the line they sit on. */
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

/**
 * The files a route's UI is built from, in walk order.
 *
 * T18 split this out of `routeSource` because two of the three states it added
 * are *file* questions, not text ones: "which file pins a width wider than the
 * device" and "is that same file a horizontal scroll region" cannot be asked of
 * a concatenated string, and an exemption that cannot name a file is one nobody
 * can check.
 */
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

describe("G8 — inventory routes answer the states PRD §12.7 requires", () => {
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

  // -------------------------------------------------------------------------
  // T18 — accessibility, success and mobile.
  // -------------------------------------------------------------------------

  it("keeps inventory covered by a suite that actually runs axe", () => {
    // The guard on the guard: a parse that finds nothing reports zero
    // uncovered surfaces, which reads exactly like full coverage.
    expect(routes.length).toBeGreaterThan(40);
    expect(existsSync(A11Y_SUITE)).toBe(true);

    const suite = readFileSync(A11Y_SUITE, "utf8");
    const covered = namedListValues(suite, "A11Y_COVERED_ROUTES", "route");
    const shared = namedListValues(suite, "A11Y_COVERED_SHARED", "file");

    expect(covered.length).toBeGreaterThanOrEqual(A11Y_MIN_ROUTE_SURFACES);
    expect(shared.length).toBeGreaterThanOrEqual(A11Y_MIN_SHARED_SURFACES);

    // A list of surfaces is not coverage, and counting call sites *here* does not
    // establish it either — the first version of this assertion counted the
    // helper names in that file's text and passed with every call replaced by
    // `await Promise.resolve(`, because the declarations and the helper bodies
    // made up the difference. Counting text is the wrong instrument. So the
    // suite counts its own axe runs at runtime and enforces two per named
    // surface in `afterAll`; what is checked from out here is that the guard is
    // still present, because a runtime floor somebody deleted enforces nothing.
    expect(suite).toContain("axeRunCount");
    expect(suite).toContain("afterAll(");
    expect(suite).toMatch(/expect\(axeRunCount\)\.toBeGreaterThanOrEqual\(promised\)/);

    // And it must be the repository's own axe, not a second configuration that
    // could quietly disable a rule for inventory alone.
    expect(suite).toContain('from "@/test-utils/axe"');
  });

  it("keeps the a11y coverage list pointing at routes and files that still exist", () => {
    // The same argument as the loading exemptions: an entry naming a deleted or
    // renamed surface silences nothing today and the wrong thing tomorrow, and
    // here it also inflates the count that the floor above is measuring.
    const suite = readFileSync(A11Y_SUITE, "utf8");

    // `existsSync` on the route's own page rather than membership in `routes`:
    // `routeDirs` walks *below* the inventory root and so never yields
    // "inventory" itself, and the module landing page is the highest-traffic
    // surface the a11y suite covers. Asking the filesystem is also the more
    // direct question — a route is live when it has a page.
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
    // The guard on the guard. A walk that finds no writing routes reports no
    // silent writes, which is indistinguishable from every write being confirmed.
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
    // Two ways an exemption here goes stale, and both matter: the route is gone,
    // or the route stopped writing. The second is the one that would otherwise
    // sit here forever, excusing a screen that no longer needs excusing.
    const known = new Set(routes.map(routePath));
    const byPath = new Map(routes.map((routeDir) => [routePath(routeDir), routeDir]));

    const stale = SUCCESS_EXEMPT_ROUTES.filter(({ route }) => {
      if (!known.has(route)) return true;
      const routeDir = byPath.get(route);
      if (routeDir === undefined) return true;
      return !WRITE_MARKERS.some((marker) => code(routeSource(routeDir)).includes(marker));
    }).map(({ route }) => route);

    expect(stale).toEqual([]);
    // A reason is the whole mechanism here — the list is only as good as the
    // argument each line carries, and a stub reason is an unexplained exemption
    // wearing the shape of an explained one.
    for (const { reason } of SUCCESS_EXEMPT_ROUTES)
      expect(reason.length).toBeGreaterThan(80);
  });

  it("never pins an inventory route wider than the device it has to fit", () => {
    // NOT a claim that anything fits: jsdom has no layout and this reads source.
    // See PINNED_WIDTH above for exactly what is and is not covered.
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
    // An exemption that only says "this is fine" is a rubber stamp. Each of
    // these claims a specific arrangement — a wide table directly inside a
    // horizontal scroll region — so the claim is re-read from the file and
    // checked. A file that stops being a scroll region, or stops being wide,
    // fails here rather than keeping a licence it no longer needs.
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
