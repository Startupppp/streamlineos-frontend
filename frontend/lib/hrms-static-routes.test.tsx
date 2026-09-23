import { existsSync, readFileSync } from "node:fs";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { HOME_NAV_GROUPS } from "@/components/layout/sidebar/sidebar-home-nav";
import {
  flattenNavRoutes,
  NAV_GROUPS,
} from "@/components/layout/sidebar/sidebar-nav-items";
import { resolveRouteAccess } from "@/lib/rbac/route-access/route-access";
import {
  declaredLoadingTitle,
  declaredPageTitle,
  declaredRedirect,
  hrmsRouteFiles,
} from "@/test-utils/hrms-route-files";
import {
  HRMS_SMOKE_EXCLUDED_PREFIXES,
  HRMS_STATIC_ROUTES,
  isHrmsStaticSmokeRoute,
} from "./hrms-static-routes";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/hr",
  useSearchParams: () => new URLSearchParams(),
}));

const SERVER_GATE_CALL = /\b(requirePermission|requireModulePermission|requireSession)\s*\(/;
const LAYOUT_GATE_CALL = /\benforceRouteAccess\s*\(/;
const NUMBERED_SKELETON_COLUMN = /^Column \d+$/;

const LOADING_STILL_RENDERS_NUMBERED_COLUMNS: readonly string[] = [];

function isComponentModule(
  candidate: unknown,
): candidate is { default: ComponentType } {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    "default" in candidate &&
    typeof candidate.default === "function"
  );
}

async function loadRouteComponent(file: string): Promise<ComponentType> {
  const loaded: unknown = await import(file);
  if (!isComponentModule(loaded))
    throw new Error(`${file} has no default component export`);
  return loaded.default;
}

describe("HRMS static route smoke list", () => {
  it("derives an ordered, duplicate-free list of at least 70 routes starting at the HR overview", () => {
    expect(HRMS_STATIC_ROUTES.length).toBeGreaterThanOrEqual(70);
    expect(new Set(HRMS_STATIC_ROUTES).size).toBe(HRMS_STATIC_ROUTES.length);
    expect(HRMS_STATIC_ROUTES[0]).toBe("/hr");
  });

  it("keeps every static /hr href the navigation model links, minus the excluded prefixes", () => {
    const modelled = flattenNavRoutes(
      [...NAV_GROUPS, ...HOME_NAV_GROUPS].flatMap((group) => group.routes),
    ).map((route) => route.href);
    const hrHrefs = modelled.filter(
      (href) => href === "/hr" || href.startsWith("/hr/"),
    );
    const unaccounted = hrHrefs.filter(
      (href) =>
        !HRMS_STATIC_ROUTES.includes(href) &&
        !/\[/.test(href) &&
        !HRMS_SMOKE_EXCLUDED_PREFIXES.some(
          (prefix) => href === prefix || href.startsWith(`${prefix}/`),
        ),
    );
    expect(unaccounted).toEqual([]);
    expect(hrHrefs.some((href) => href.startsWith("/hr/recruitment"))).toBe(true);
  });

  it("excludes recruitment, payroll and dynamic segments by rule, not by hand", () => {
    expect(isHrmsStaticSmokeRoute("/hr/recruitment")).toBe(false);
    expect(isHrmsStaticSmokeRoute("/hr/recruitment/jobs")).toBe(false);
    expect(isHrmsStaticSmokeRoute("/payroll/runs")).toBe(false);
    expect(isHrmsStaticSmokeRoute("/hr/employees/[employeeId]")).toBe(false);
    expect(isHrmsStaticSmokeRoute("/hr/employees")).toBe(true);
    expect(isHrmsStaticSmokeRoute("/hr")).toBe(true);
    expect(HRMS_STATIC_ROUTES.some((route) => route.startsWith("/hr/recruitment"))).toBe(false);
    expect(HRMS_STATIC_ROUTES.some((route) => route.startsWith("/payroll"))).toBe(false);
  });
});

describe.each(HRMS_STATIC_ROUTES.map((route) => [route] as const))(
  "HRMS static route %s",
  (route) => {
    const files = hrmsRouteFiles(route);

    afterEach(cleanup);

    it("has a page.tsx under app/(authenticated)", () => {
      expect(existsSync(files.page)).toBe(true);
    });

    it("is gated server-side: the page calls require*() itself, or a layout's enforceRouteAccess resolves it to a registered decision", () => {
      const pageSource = readFileSync(files.page, "utf8");
      const pageGate = SERVER_GATE_CALL.test(pageSource);
      const layoutGate = files.layouts.some((layout) =>
        LAYOUT_GATE_CALL.test(readFileSync(layout, "utf8")),
      );
      const decision = resolveRouteAccess(route);
      const registered =
        decision.kind === "universal" ||
        (decision.kind === "permission" &&
          (decision.permission !== null || decision.orgModuleKey !== null));
      expect(registered).toBe(true);
      expect(pageGate || layoutGate).toBe(true);
    });

    it("declares a redirect only for the company settings hand-off", () => {
      const redirect = declaredRedirect(route);
      if (route === "/hr/settings/company")
        expect(redirect).toBe("/settings/organization");
      else expect(redirect).toBeNull();
    });

    it("renders its loading skeleton with a non-empty level-1 heading, if it has one", async () => {
      if (!files.loading) return;
      const Loading = await loadRouteComponent(files.loading);
      render(<Loading />);
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading.textContent?.trim()).not.toBe("");
    });

    it("titles its loading skeleton with the page's own declared title, when both are static strings", () => {
      const loadingTitle = declaredLoadingTitle(route);
      const pageTitle = declaredPageTitle(route);
      if (loadingTitle === null || pageTitle === null) return;
      expect(loadingTitle).toBe(pageTitle);
    });

    it("announces typed skeleton headers, not numbered columns — the known list may only shrink, and an entry that stops matching must be removed", async () => {
      if (!files.loading) return;
      const Loading = await loadRouteComponent(files.loading);
      render(<Loading />);
      const numbered = screen
        .queryAllByText(NUMBERED_SKELETON_COLUMN)
        .map((node) => node.textContent);
      const known = LOADING_STILL_RENDERS_NUMBERED_COLUMNS.includes(route);
      if (known) expect(numbered).toContain("Column 1");
      else expect(numbered).toEqual([]);
    });
  },
);
