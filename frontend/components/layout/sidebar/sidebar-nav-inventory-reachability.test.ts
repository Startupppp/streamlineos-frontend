import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { NAV_GROUPS, flattenNavRoutes } from "./sidebar-nav-items";

/**
 * T10 — an inventory nav link points at a route that exists, and an inventory
 * route nothing links to has to say why.
 *
 * The backend has two ratchets of this shape: `inventory-reachability.spec.ts`
 * (a module has a caller) and `inventory-schema-reachability.spec.ts` (a table
 * has a reader). The frontend had neither. `sidebar-product-reachability.test.ts`
 * beside this file reasons over `NAV_GROUPS` **objects** — it asserts each group
 * appears in exactly one product — and never touches the filesystem, so nothing
 * asserted that an `href` resolves to a `page.tsx` at all.
 *
 * All of them happened to resolve. That was luck, not a gate: T09 exists because
 * four inventory URLs drifted into 404 with nothing noticing, and the one the
 * sidebar itself pointed at — the Reports parent, aliasing its own first child —
 * hid the hole rather than exposing it. PRD §12.5 (`prd:718`) requires the module
 * to be integrated end to end, and a nav entry pointing at a route that does not
 * exist is the cheapest possible way to fail that.
 *
 * ## What this asserts, and what it deliberately does not
 *
 * **Forward:** every inventory nav href resolves to a real `page.tsx`. Static
 * segments match literally; a concrete id in an href matches a `[param]`
 * directory positionally, the way Next.js resolves it.
 *
 * **Reverse:** every inventory `page.tsx` no nav href reaches is named in
 * `NAV_ORPHANS` below with a one-line reason. That is **not** a demand that every
 * route be in the sidebar — detail routes, `/new` forms and in-page destinations
 * are legitimately unlisted, and putting eighty-six entries in a rail would be a
 * worse product. It is a demand that a genuinely orphaned screen has to be
 * argued for rather than quietly ignored, which is the state the module was in
 * before T09.
 *
 * It cannot say a route *works*, or that a person may open it, or that the
 * screen behind the link is the one the label promises. It says the link is not
 * broken, which is the floor nothing was holding.
 */

const FRONTEND_ROOT = join(__dirname, "..", "..", "..");
const AUTH_DIR = join(FRONTEND_ROOT, "app", "(authenticated)");
const INVENTORY_DIR = join(AUTH_DIR, "inventory");

/**
 * Every inventory href the navigation model declares, parents included.
 *
 * Collected from all of `NAV_GROUPS` rather than from `INVENTORY_NAV_GROUPS`
 * alone: a group in another product that links into `/inventory/*` is exactly
 * the entry most likely to rot unnoticed, because the inventory session never
 * reads that file. `flattenNavRoutes` is the same walker `sidebar-deep-link`
 * uses, so a parent href — the kind T09 found aliasing its own child — is in
 * scope rather than skipped.
 */
const INVENTORY_HREFS: readonly string[] = [
  ...new Set(
    NAV_GROUPS.flatMap((group) => flattenNavRoutes(group.routes))
      .map((route) => route.href)
      .filter((href) => href === "/inventory" || href.startsWith("/inventory/")),
  ),
].sort();

/**
 * Inventory routes no nav href reaches, each with the reason it is not in nav.
 *
 * Three shapes, and nothing else belongs here:
 *
 *   * **detail** — a route behind an id. Nav cannot link to it because there is
 *     no id until a reader picks a row;
 *   * **form** — `/new`, opened from its list's create action;
 *   * **in-page** — a destination a hub, a tile or a link inside another screen
 *     owns. Adding it to the rail would list the same screen twice.
 *
 * A route that fits none of these is an orphan for real, and the fix is a nav
 * entry rather than a line here. Every reason names where the route *is* reached
 * from, so a claim can be checked instead of taken on trust.
 */
const NAV_ORPHANS: ReadonlyArray<{ route: string; reason: string }> = [
  // ---- detail routes: no id exists until a reader picks a row ----
  { route: "inventory/cycle-counts/[countId]", reason: "detail — a count row on /inventory/cycle-counts, and the RF queue's COUNT task" },
  { route: "inventory/lots/[lotId]", reason: "detail — a lot row on /inventory/lots" },
  { route: "inventory/physical-audits/[auditId]", reason: "detail — an audit row on /inventory/physical-audits" },
  { route: "inventory/products/[productId]", reason: "detail — a product row on /inventory/products" },
  { route: "inventory/projects/[projectId]", reason: "detail — a project row on /inventory/projects" },
  { route: "inventory/purchase-orders/[poId]", reason: "detail — a PO row on /inventory/purchase-orders" },
  { route: "inventory/rf/pick/[pickListId]", reason: "detail — the RF task runner, opened by tapping a wave in the RF queue" },
  { route: "inventory/rf/putaway/[taskId]", reason: "detail — the RF task runner, opened by tapping a task in the RF queue" },
  { route: "inventory/sales-orders/[soId]", reason: "detail — an SO row on /inventory/sales-orders" },
  { route: "inventory/serials/[serialId]", reason: "detail — a serial row on /inventory/serials" },
  { route: "inventory/stock/transfers/[transferId]", reason: "detail — a transfer row on /inventory/stock/transfers" },
  { route: "inventory/vendors/[vendorId]", reason: "detail — a vendor row on /inventory/vendors" },
  { route: "inventory/warehouses/[warehouseId]", reason: "detail — a warehouse row on /inventory/warehouses" },

  // ---- creation forms: opened from their list's create action ----
  { route: "inventory/products/new", reason: "form — the create action on /inventory/products" },
  { route: "inventory/purchase-orders/new", reason: "form — the create action on /inventory/purchase-orders" },
  { route: "inventory/sales-orders/new", reason: "form — the create action on /inventory/sales-orders" },

  // ---- in-page destinations owned by a hub ----
  // The operations hub renders one tile per queue (operations/page.tsx
  // STATIC_CARDS), each gated on that queue's own permission. Picking is the
  // exception and IS in nav: inventory.md:1358 asks for it by name, so T09 added
  // "Pick lists" under Operations.
  { route: "inventory/operations/issues", reason: "in-page — an operations hub tile" },
  { route: "inventory/operations/packing", reason: "in-page — an operations hub tile" },
  { route: "inventory/operations/putaway", reason: "in-page — an operations hub tile, and a work-aging drill-through" },
  { route: "inventory/operations/receipts", reason: "in-page — an operations hub tile, and a work-aging drill-through" },
  { route: "inventory/operations/returns", reason: "in-page — an operations hub tile" },
  { route: "inventory/operations/shipping", reason: "in-page — an operations hub tile, and a work-aging drill-through" },
  // The quality landing screen pushes to each of these (quality/page.tsx) and
  // links its stat cards at them with a status filter attached.
  { route: "inventory/quality/holds", reason: "in-page — a /inventory/quality tab and stat card" },
  { route: "inventory/quality/inspections", reason: "in-page — a /inventory/quality tab and stat card" },
  { route: "inventory/quality/plans", reason: "in-page — a /inventory/quality tab" },
  { route: "inventory/quality/recalls", reason: "in-page — a /inventory/quality tab and stat card" },
  { route: "inventory/replenishment/rules", reason: "in-page — the rules link on the replenishment client" },

  // ---- T09's answers to a URL that used to 404 ----
  // These three exist for direct entry — a bookmark, a pasted link, a scanner
  // that dropped the id — rather than for browsing, so listing them in the rail
  // would advertise a fallback as a destination.
  { route: "inventory/pick-lists", reason: "alias — redirects to /inventory/operations/picking, which IS in nav as \"Pick lists\" (inventory.md:1358)" },
  { route: "inventory/rf/pick", reason: "in-page — the RF queue filtered to picks; reached by backing out of a runner or by a truncated deep link, not by browsing" },
  { route: "inventory/rf/putaway", reason: "in-page — the RF queue filtered to putaway; reached by backing out of a runner or by a truncated deep link, not by browsing" },
];

/**
 * The directory an href resolves to, or `null` if nothing routes it.
 *
 * Resolves the way Next.js does, which is why it is a walk rather than a string
 * join. A literal directory beats a `[param]` one at the same depth; a `[param]`
 * directory matches any single segment, so a nav href carrying a concrete id
 * lands on the detail route rather than reporting a 404 that is not there; and a
 * `(group)` directory consumes no URL segment at all, so a future
 * `inventory/(admin)/settings` does not read as broken. Backtracking matters:
 * `/a/b` where `a/` and `[x]/` both exist but only `[x]/b` has a page must
 * resolve, and a greedy first match would call it unreachable.
 */
function resolveFrom(dir: string, segments: readonly string[]): string | null {
  if (segments.length === 0) return existsSync(join(dir, "page.tsx")) ? dir : null;

  const [head, ...rest] = segments;
  const dirs = readdirSync(dir, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory(),
  );

  const literal = dirs.find((entry) => entry.name === head);
  if (literal) {
    const found = resolveFrom(join(dir, literal.name), rest);
    if (found !== null) return found;
  }

  for (const entry of dirs.filter((e) => /^\[.+\]$/.test(e.name))) {
    const found = resolveFrom(join(dir, entry.name), rest);
    if (found !== null) return found;
  }

  for (const entry of dirs.filter((e) => /^\(.+\)$/.test(e.name))) {
    const found = resolveFrom(join(dir, entry.name), segments);
    if (found !== null) return found;
  }

  return null;
}

/** The `(authenticated)` slash-path an href routes to, or `null`. */
function resolveHref(href: string): string | null {
  const path = (href.split(/[?#]/)[0] ?? "").trim();
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const dir = resolveFrom(AUTH_DIR, segments);
  return dir === null ? null : relative(AUTH_DIR, dir).replace(/\\/g, "/");
}

/** Every routed directory under `inventory/`, itself included. */
function routePaths(dir: string, acc: string[] = []): string[] {
  if (existsSync(join(dir, "page.tsx"))) acc.push(relative(AUTH_DIR, dir).replace(/\\/g, "/"));
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) routePaths(join(dir, entry.name), acc);
  }
  return acc;
}

describe("T10 — every inventory nav link resolves, and every unlisted route says why", () => {
  const routes = routePaths(INVENTORY_DIR).sort();

  it("collects enough hrefs that a broken walk cannot pass as zero violations", () => {
    // The guard on the guard, and the reason it is a floor rather than an exact
    // number: a collector that returns nothing reports no unresolvable links,
    // which reads exactly like success. Fifty is comfortably below the fifty-six
    // declared today, so adding or removing an entry does not touch this line —
    // only a collector that has stopped collecting does.
    expect(INVENTORY_HREFS.length).toBeGreaterThanOrEqual(50);
  });

  it("finds the inventory routes at all, so the reverse walk cannot pass silently", () => {
    expect(routes.length).toBeGreaterThan(40);
  });

  it("resolves a real route, a parameterised one and nothing else", () => {
    // The resolver is the whole gate, so it is checked before it is trusted. A
    // resolver that always answers reports zero broken links; one that never
    // matches a `[param]` reports every detail link as broken and gets switched
    // off. Both failures are silent in the assertions below.
    expect(resolveHref("/inventory/reports")).toBe("inventory/reports");
    expect(resolveHref("/inventory/lots/12345")).toBe("inventory/lots/[lotId]");
    expect(resolveHref("/inventory/reports/stock-summary?warehouse=1")).toBe(
      "inventory/reports/stock-summary",
    );
    expect(resolveHref("/inventory/does-not-exist")).toBeNull();
    // A directory with children but no page of its own is not a route — this is
    // precisely what `/inventory/reports` was before T09.
    expect(resolveHref("/inventory/rf/pick/[pickListId]/nope")).toBeNull();
  });

  it("points every inventory nav href at a page.tsx that exists", () => {
    const broken = INVENTORY_HREFS.filter((href) => resolveHref(href) === null);

    expect(broken).toEqual([]);
  });

  it("names every inventory route nav does not reach, with a reason", () => {
    const reached = new Set(
      INVENTORY_HREFS.map(resolveHref).filter((route): route is string => route !== null),
    );
    const orphans = routes.filter((route) => !reached.has(route));

    expect(orphans).toEqual(NAV_ORPHANS.map(({ route }) => route).sort());
  });

  it("keeps the orphan list pointing at routes that still exist", () => {
    // An entry for a route that has been deleted or renamed silences nothing
    // today and the wrong thing tomorrow, when a new route takes the name. The
    // assertion above would catch it as a set mismatch, but the failure would
    // read as an unexplained orphan rather than as a stale line — this one names
    // it, which is the difference between a five-minute fix and an hour.
    const known = new Set(routes);
    const stale = NAV_ORPHANS.filter(({ route }) => !known.has(route)).map(
      ({ route, reason }) => `${route} — ${reason}`,
    );

    expect(stale).toEqual([]);
  });

  it("gives each orphan exactly one entry, and a real reason", () => {
    // A duplicated route would let the set comparison above pass while the list
    // disagrees with itself, and an empty reason is a line that explains nothing
    // while looking as though it does.
    const seen = new Set<string>();
    const duplicated = NAV_ORPHANS.map(({ route }) => route).filter((route) => {
      if (seen.has(route)) return true;
      seen.add(route);
      return false;
    });
    const unexplained = NAV_ORPHANS.filter(({ reason }) => reason.trim().length < 12).map(
      ({ route }) => route,
    );

    expect(duplicated).toEqual([]);
    expect(unexplained).toEqual([]);
  });
});
