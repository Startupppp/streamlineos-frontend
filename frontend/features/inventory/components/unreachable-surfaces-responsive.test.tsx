import type { ReactElement } from "react";
import { screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { renderWithProviders, axeViolationIds } from "@/test-utils";
import { atViewport, VIEWPORTS } from "@/test-utils/viewport";
import { TransitClient } from "./stock/transit-client";
import { GlReconciliationClient } from "./finance/gl-reconciliation-client";
import { LandedCostClient } from "./finance/landed-cost-client";


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

const FIXED_WIDTH = /\b(?:min-)?w-\[(\d+)px\]/g;

function expectNothingWiderThan(container: HTMLElement, width: number): void {
  const tooWide: string[] = [];
  for (const element of Array.from(container.querySelectorAll("[class]"))) {
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
