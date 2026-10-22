import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { NAV_GROUPS, flattenNavRoutes } from "./sidebar-nav-items";


const FRONTEND_ROOT = join(__dirname, "..", "..", "..");
const AUTH_DIR = join(FRONTEND_ROOT, "app", "(authenticated)");
const INVENTORY_DIR = join(AUTH_DIR, "inventory");

const INVENTORY_HREFS: readonly string[] = [
  ...new Set(
    NAV_GROUPS.flatMap((group) => flattenNavRoutes(group.routes))
      .map((route) => route.href)
      .filter((href) => href === "/inventory" || href.startsWith("/inventory/")),
  ),
].sort();

const NAV_ORPHANS: ReadonlyArray<{ route: string; reason: string }> = [
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

  { route: "inventory/products/new", reason: "form — the create action on /inventory/products" },
  { route: "inventory/purchase-orders/new", reason: "form — the create action on /inventory/purchase-orders" },
  { route: "inventory/sales-orders/new", reason: "form — the create action on /inventory/sales-orders" },

  { route: "inventory/operations/issues", reason: "in-page — an operations hub tile" },
  { route: "inventory/operations/packing", reason: "in-page — an operations hub tile" },
  { route: "inventory/operations/putaway", reason: "in-page — an operations hub tile, and a work-aging drill-through" },
  { route: "inventory/operations/receipts", reason: "in-page — an operations hub tile, and a work-aging drill-through" },
  { route: "inventory/operations/returns", reason: "in-page — an operations hub tile" },
  { route: "inventory/operations/shipping", reason: "in-page — an operations hub tile, and a work-aging drill-through" },
  { route: "inventory/quality/holds", reason: "in-page — a /inventory/quality tab and stat card" },
  { route: "inventory/quality/inspections", reason: "in-page — a /inventory/quality tab and stat card" },
  { route: "inventory/quality/plans", reason: "in-page — a /inventory/quality tab" },
  { route: "inventory/quality/recalls", reason: "in-page — a /inventory/quality tab and stat card" },
  { route: "inventory/replenishment/rules", reason: "in-page — the rules link on the replenishment client" },

  { route: "inventory/pick-lists", reason: "alias — redirects to /inventory/operations/picking, which IS in nav as \"Pick lists\" (inventory.md:1358)" },
  { route: "inventory/rf/pick", reason: "in-page — the RF queue filtered to picks; reached by backing out of a runner or by a truncated deep link, not by browsing" },
  { route: "inventory/rf/putaway", reason: "in-page — the RF queue filtered to putaway; reached by backing out of a runner or by a truncated deep link, not by browsing" },
];

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

function resolveHref(href: string): string | null {
  const path = (href.split(/[?#]/)[0] ?? "").trim();
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const dir = resolveFrom(AUTH_DIR, segments);
  return dir === null ? null : relative(AUTH_DIR, dir).replace(/\\/g, "/");
}

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
    expect(INVENTORY_HREFS.length).toBeGreaterThanOrEqual(50);
  });

  it("finds the inventory routes at all, so the reverse walk cannot pass silently", () => {
    expect(routes.length).toBeGreaterThan(40);
  });

  it("resolves a real route, a parameterised one and nothing else", () => {
    expect(resolveHref("/inventory/reports")).toBe("inventory/reports");
    expect(resolveHref("/inventory/lots/12345")).toBe("inventory/lots/[lotId]");
    expect(resolveHref("/inventory/reports/stock-summary?warehouse=1")).toBe(
      "inventory/reports/stock-summary",
    );
    expect(resolveHref("/inventory/does-not-exist")).toBeNull();
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
    const known = new Set(routes);
    const stale = NAV_ORPHANS.filter(({ route }) => !known.has(route)).map(
      ({ route, reason }) => `${route} — ${reason}`,
    );

    expect(stale).toEqual([]);
  });

  it("gives each orphan exactly one entry, and a real reason", () => {
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
