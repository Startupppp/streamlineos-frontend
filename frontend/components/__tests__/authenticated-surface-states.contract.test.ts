import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FE_ROOT,
  analyzeAuthenticatedSurfaces,
  analyzeFilterEmptyConflation,
  classifySource,
} from "@/test-utils/surface-state-analysis";

/**
 * A ratchet, not a target. Every number here was measured; lowering one is a
 * deliberate edit and raising one fails review. Loading, read-error and
 * permission gates are all at zero, so any surface that loses one fails
 * immediately rather than after a slide.
 */
const BASELINE = {
  minimumSurfaces: 540,
  missingLoading: 0,
  missingEmpty: 8,
  missingError: 0,
  missingPermissionDenied: 0,
  filterEmptyConflation: 55,
} as const;

/**
 * A count alone lets one surface lose its empty state while another gains one
 * and the ratchet never moves. These eight are the whole residue, and every one
 * of them was read: none renders a server collection that can come back with
 * zero rows, so an EmptyState here would be decoration that never appears.
 * Adding a route to this list is the same weight as lowering a number.
 *
 * `/inventory/operations` left on 2026-09-12: it renders an `EmptyState` of its
 * own now, so pinning it would excuse the next surface added at that route.
 * `/inventory/reports` did not take its place — the reports hub can render zero
 * cards when the nav model carries none that the caller may open, so it was
 * given a real empty state rather than an entry here.
 */
const EMPTY_STATE_NOT_APPLICABLE = [
  "/build/managed-products/[managedProductId]/insights",
  "/crm/import",
  "/hr/recruitment/sla",
  "/inventory/products/new",
  "/notifications/policy",
  "/settings/organization/structure",
  "/surveys/new",
] as const;

const surfaces = analyzeAuthenticatedSurfaces();
const dataSurfaces = surfaces.filter((surface) => surface.readsServerState);

const WITHIN_BASELINE = "within baseline";

function verdict(
  predicate: (surface: (typeof dataSurfaces)[number]) => boolean,
  ceiling: number,
): string {
  const missing = dataSurfaces.filter(predicate);
  return missing.length <= ceiling ? WITHIN_BASELINE : report(missing);
}

function report(missing: { route: string }[], limit = 20): string {
  const shown = missing.slice(0, limit).map((surface) => surface.route);
  const suffix = missing.length > limit ? ` … and ${missing.length - limit} more` : "";
  return `${missing.length}: ${shown.join(", ")}${suffix}`;
}

describe("authenticated surfaces — the analyzer sees a real tree", () => {
  it("finds every authenticated route module", () => {
    expect(surfaces.length).toBeGreaterThanOrEqual(BASELINE.minimumSurfaces);
  });

  it("resolves route modules through to their feature-owned bodies, not just the thin shim", () => {
    const resolved = surfaces.filter((surface) => surface.moduleCount >= 2);
    expect(resolved.length).toBeGreaterThanOrEqual(BASELINE.minimumSurfaces);
  });

  it("classifies nearly every authenticated surface as reading server state", () => {
    expect(dataSurfaces.length).toBeGreaterThanOrEqual(BASELINE.minimumSurfaces - 20);
  });
});

describe("state coverage ratchet — loading / empty / error / permission-denied", () => {
  it(`no more than ${BASELINE.missingLoading} surfaces lack a loading state`, () => {
    expect(verdict((surface) => !surface.loading, BASELINE.missingLoading)).toBe(
      WITHIN_BASELINE,
    );
  });

  it(`no more than ${BASELINE.missingEmpty} surfaces lack an empty state`, () => {
    expect(verdict((surface) => !surface.empty, BASELINE.missingEmpty)).toBe(
      WITHIN_BASELINE,
    );
  });

  it(`no more than ${BASELINE.missingError} surfaces lack a read-error state`, () => {
    expect(verdict((surface) => !surface.error, BASELINE.missingError)).toBe(
      WITHIN_BASELINE,
    );
  });

  it(`no more than ${BASELINE.missingPermissionDenied} surfaces lack a permission gate`, () => {
    expect(
      verdict((surface) => !surface.permissionDenied, BASELINE.missingPermissionDenied),
    ).toBe(WITHIN_BASELINE);
  });

  it("the surfaces without an empty state are exactly the ones recorded as not needing one", () => {
    const missing = dataSurfaces
      .filter((surface) => !surface.empty)
      .map((surface) => surface.route)
      .sort();
    expect(missing).toEqual([...EMPTY_STATE_NOT_APPLICABLE]);
  });

  it("prints the current numbers so a lowered baseline is a deliberate edit", () => {
    const current = {
      surfaces: surfaces.length,
      dataSurfaces: dataSurfaces.length,
      missingLoading: dataSurfaces.filter((s) => !s.loading).length,
      missingEmpty: dataSurfaces.filter((s) => !s.empty).length,
      missingError: dataSurfaces.filter((s) => !s.error).length,
      missingPermissionDenied: dataSurfaces.filter((s) => !s.permissionDenied).length,
    };
    expect(current.missingLoading).toBeLessThanOrEqual(BASELINE.missingLoading);
    expect(current.missingEmpty).toBeLessThanOrEqual(BASELINE.missingEmpty);
    expect(current.missingError).toBeLessThanOrEqual(BASELINE.missingError);
    expect(current.missingPermissionDenied).toBeLessThanOrEqual(
      BASELINE.missingPermissionDenied,
    );
  });
});

describe("filter-empty is not conflated with data-empty", () => {
  it(`no more than ${BASELINE.filterEmptyConflation} files render EmptyState beside filter state without filtersActive`, () => {
    const conflated = analyzeFilterEmptyConflation();
    expect(conflated.length).toBeLessThanOrEqual(BASELINE.filterEmptyConflation);
  });

  it("EmptyState itself keeps the two meanings apart", () => {
    const source = readFileSync(
      join(FE_ROOT, "components/ui/empty-state.tsx"),
      "utf8",
    );
    expect(source).toContain("No results match your filters.");
    expect(source).toContain("Clear filters");
    expect(source).toContain("filtersActive");
  });
});

describe("offline is handled once, in the shell, for every authenticated surface", () => {
  const shell = readFileSync(
    join(FE_ROOT, "components/layout/dashboard-shell.tsx"),
    "utf8",
  );
  const banner = readFileSync(
    join(FE_ROOT, "components/layout/shell-offline-banner.tsx"),
    "utf8",
  );

  it("the shell mounts the offline banner, so no page has to", () => {
    expect(shell).toContain("<ShellOfflineBanner />");
  });

  it("the banner is a polite live region, not silent chrome", () => {
    expect(banner).toContain('role="status"');
    expect(banner).toContain('aria-live="polite"');
  });

  it("the banner reacts to both online and offline events", () => {
    const hook = readFileSync(
      join(FE_ROOT, "hooks/common/use-online-status.ts"),
      "utf8",
    );
    expect(hook).toContain('addEventListener("online"');
    expect(hook).toContain('addEventListener("offline"');
  });

  it("BITE PROOF — deleting the banner from the shell fails this suite", () => {
    expect(shell.includes("ShellOfflineBanner")).toBe(true);
  });
});

describe("analyzer self-test — each signal is detected and its absence is detected", () => {
  const withEverything = `
    const { data, isLoading, isError, refetch } = useQuery(opts);
    if (isLoading) return <DataTableSkeleton rows={10} columns={4} />;
    if (isError) return <ErrorState onRetry={refetch} />;
    if (!useCan("x:y:view")) return <NoPermissionState permission="x:y:view" />;
    return <EmptyState title="Nothing" />;
  `;
  const withNothing = `
    export function StaticPanel() {
      return <div>Hello</div>;
    }
  `;

  it("detects all four states in a surface that has them", () => {
    expect(classifySource(withEverything)).toEqual({
      readsServerState: true,
      loading: true,
      empty: true,
      error: true,
      permissionDenied: true,
      pageLevelSpinner: false,
    });
  });

  it("detects none of them in a surface that has none", () => {
    expect(classifySource(withNothing)).toEqual({
      readsServerState: false,
      loading: false,
      empty: false,
      error: false,
      permissionDenied: false,
      pageLevelSpinner: false,
    });
  });

  it("flags animate-spin used as a page loading state (AP-7)", () => {
    expect(
      classifySource('if (isLoading) return <div className="animate-spin" />;')
        .pageLevelSpinner,
    ).toBe(true);
  });

  it("counts a server-side requirePermission as a permission gate", () => {
    expect(
      classifySource('await requirePermission("hr:leaves:view");').permissionDenied,
    ).toBe(true);
  });

  it("does NOT count a mutation-only file as reading server state", () => {
    expect(
      classifySource("const m = useMutation({ mutationFn });").readsServerState,
    ).toBe(false);
  });

  it("does NOT read a cache handle as a read — useQueryClient invalidates, it does not fetch", () => {
    expect(
      classifySource("const qc = useQueryClient();\nvoid qc.invalidateQueries({ queryKey });")
        .readsServerState,
    ).toBe(false);
  });

  it("BITE PROOF — a real useQuery call is still a read", () => {
    expect(classifySource("const q = useQuery({ queryKey, queryFn });").readsServerState).toBe(
      true,
    );
    expect(classifySource("const q = useQuery<Row[]>({ queryKey });").readsServerState).toBe(true);
  });
});
