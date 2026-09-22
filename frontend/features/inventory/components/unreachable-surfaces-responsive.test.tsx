import type { ReactElement } from "react";
import { screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { renderWithProviders, axeViolationIds } from "@/test-utils";
import { atViewport, VIEWPORTS } from "@/test-utils/viewport";
import { TransitClient } from "./stock/transit-client";
import { GlReconciliationClient } from "./finance/gl-reconciliation-client";
import { LandedCostClient } from "./finance/landed-cost-client";

/**
 * The three new full-page surfaces at 375, 768 and 1280.
 *
 * ## What this claims, and what it does not
 *
 * jsdom has no layout, so "fits at 375px" is not something this file can say,
 * and asserting it would be a lie a green tick makes convincing. What it can say
 * is that each page mounts at every breakpoint without throwing, that nothing in
 * the rendered tree pins a width the device does not have, and that axe finds no
 * violation in the tree that results — the same three claims
 * `rf-surface-render.test.tsx` makes about the handheld screens, for the same
 * reason.
 *
 * The width rule has one deliberate exemption: `DataTable`'s `minWidth` is how a
 * wide table is made to scroll horizontally inside its own container rather than
 * crushing its columns, which §10 requires. It is applied to the table's inner
 * div via an inline style, not a class, so the class scan below does not see it
 * and does not need an exception written for it.
 */

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/inventory",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useCanState: () => "granted",
}));
jest.mock("@/hooks/api/org-display", () => ({
  useOrgDisplay: () => ({ currency: "INR", locale: "en-IN" }),
}));
jest.mock("@/hooks/api/inventory/warehouses", () => ({
  useWarehouses: () => ({ data: { items: [{ id: 1, name: "North DC", code: "GDC" }], total: 1, page: 1, totalPages: 1 } }),
}));
jest.mock("@/hooks/api/inventory/operations", () => ({
  useGoodsReceipts: () => ({ data: { items: [] }, isLoading: false }),
}));

const emptyQuery = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

jest.mock("@/hooks/api/inventory/transit", () => ({
  ...jest.requireActual("@/hooks/api/inventory/transit"),
  useStrandedTransit: () => ({
    ...emptyQuery,
    data: { items: [], total: 0, page: 1, totalPages: 0 },
  }),
  useExitTransit: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/inventory/gl-reconciliation", () => ({
  ...jest.requireActual("@/hooks/api/inventory/gl-reconciliation"),
  useGlReconciliation: () => emptyQuery,
  useGlReconPeriods: () => ({ data: { installed: false, items: [] } }),
}));

jest.mock("@/hooks/api/inventory/landed-cost", () => ({
  ...jest.requireActual("@/hooks/api/inventory/landed-cost"),
  useLandedCostVouchers: () => ({
    ...emptyQuery,
    data: { items: [], total: 0, page: 1, totalPages: 0 },
  }),
  useLandedCostVoucher: () => emptyQuery,
  useCreateLandedCostVoucher: () => ({ mutate: jest.fn(), isPending: false }),
  useApplyLandedCostVoucher: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteLandedCostVoucher: () => ({ mutate: jest.fn(), isPending: false }),
  useAddLandedCostCharge: () => ({ mutate: jest.fn(), isPending: false }),
}));

/** A class that pins content wider than the device is a horizontal scroll by another name. */
const FIXED_WIDTH = /\b(?:min-)?w-\[(\d+)px\]/g;

function expectNothingWiderThan(container: HTMLElement, width: number): void {
  const tooWide: string[] = [];
  for (const element of Array.from(container.querySelectorAll("[class]"))) {
    // `getAttribute`, not `className`: on an SVG that property is an
    // `SVGAnimatedString`, and every icon on these pages is an SVG.
    const classes = element.getAttribute("class") ?? "";
    for (const match of classes.matchAll(FIXED_WIDTH))
      if (Number(match[1]) > width) tooWide.push(match[0]);
  }
  expect(tooWide).toEqual([]);
}

const SURFACES: ReadonlyArray<{ name: string; heading: RegExp; render: () => ReactElement }> = [
  { name: "in transit", heading: /In transit/i, render: () => <TransitClient /> },
  {
    name: "GL reconciliation",
    heading: /GL reconciliation/i,
    render: () => <GlReconciliationClient />,
  },
  { name: "landed cost", heading: /Landed cost/i, render: () => <LandedCostClient /> },
];

describe("the surfaces the audit added, at every breakpoint", () => {
  it("covers enough surfaces that an empty run cannot pass as coverage", () => {
    expect(SURFACES).toHaveLength(3);
    expect(Object.keys(VIEWPORTS)).toEqual(["mobile", "tablet", "desktop"]);
  });

  describe.each(["mobile", "tablet", "desktop"] as const)("at %s", (viewport) => {
    it.each(SURFACES.map((surface) => [surface.name, surface] as const))(
      "%s renders its heading and pins no width the device lacks",
      (_name, surface) => {
        const restore = atViewport(viewport);
        try {
          const { container } = renderWithProviders(
            <TooltipProvider>{surface.render()}</TooltipProvider>,
          );
          // Level 1: the page's own `<h1>`, not an empty state's heading, which on
          // the landed-cost page happens to start with the same words.
          expect(
            screen.getByRole("heading", { level: 1, name: surface.heading }),
          ).toBeInTheDocument();
          expectNothingWiderThan(container, VIEWPORTS[viewport]);
        } finally {
          restore();
        }
      },
    );
  });

  /**
   * The `heading-order` debt these pages carried is gone.
   *
   * `EmptyState` rendered its title as an `<h3>` under `PageWrapper`'s `<h1>`,
   * which skips a level, so axe reported `heading-order` on every list page in
   * the product that rendered an empty state — not only these three. It now
   * opens with an `<h2>`, so the expectation is the empty list it always said it
   * would come back down to, and the exact-list assertion still fails on any new
   * violation and on any extra violating node.
   */
  it.each(SURFACES.map((surface) => [surface.name, surface] as const))(
    "%s carries no accessibility violation at 375",
    async (_name, surface) => {
      const restore = atViewport("mobile");
      try {
        const { container } = renderWithProviders(
          <TooltipProvider>{surface.render()}</TooltipProvider>,
        );
        expect(await axeViolationIds(container)).toEqual([]);
      } finally {
        restore();
      }
    },
    30_000,
  );
});
