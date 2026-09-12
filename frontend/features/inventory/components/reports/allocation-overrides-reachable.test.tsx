import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { INVENTORY_NAV_GROUPS } from "@/components/layout/sidebar/sidebar-nav-groups-inventory";
import InventoryAllocationOverridesPage from "@/app/(authenticated)/inventory/reports/allocation-overrides/page";

/**
 * `GET /inventory/traceability/allocation-overrides` had no caller. It is the
 * only record that a near-expiry or minimum-shelf-life policy was overruled on a
 * specific lot, for a named client, by a named person, with a stated reason —
 * and nothing in the product could read it, so the control was running for
 * nobody.
 *
 * Two claims, and the second is the one a component test would have missed: the
 * screen renders the register, and the screen is reachable. Route access in this
 * app derives from the navigation model, so a page with no nav entry redirects
 * to /access-denied however good its own tests are.
 */

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/inventory/reports/allocation-overrides",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("@/hooks/api/inventory/allocation-overrides", () => ({
  ...jest.requireActual("@/hooks/api/inventory/allocation-overrides"),
  useAllocationOverrides: () => ({
    data: {
      items: [
        {
          id: 12,
          actorUserId: "user-9",
          actorName: "Meera Nair",
          reason: "Customer accepted the short date in writing",
          verdict: "NEAR_EXPIRY",
          lotId: 44,
          lotNumber: "LOT-44",
          lotExpiryDate: "2026-10-01",
          daysRemaining: 11,
          nearExpiryPolicy: "BLOCK",
          nearExpiryWindowDays: 30,
          minShelfLifeDays: null,
          productVariantId: 7,
          sourceType: "SALES_ORDER",
          sourceId: "SO-204",
          clientId: 3,
          clientName: "Sunrise Pharmacy",
          reservationId: 88,
          createdAt: "2026-09-09T11:30:00.000Z",
        },
      ],
      limit: 50,
      hasMore: false,
      nextCursor: null,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

function renderPage(): void {
  renderWithProviders(
    <TooltipProvider>
      <InventoryAllocationOverridesPage />
    </TooltipProvider>,
  );
}

it("names who set the rule aside, on which lot, and why", () => {
  renderPage();

  expect(screen.getByText("Meera Nair")).toBeInTheDocument();
  expect(screen.getByText("LOT-44")).toBeInTheDocument();
  expect(screen.getByText("Sunrise Pharmacy")).toBeInTheDocument();
  expect(
    screen.getByText("Customer accepted the short date in writing"),
  ).toBeInTheDocument();
});

/**
 * "An override happened" and "an override of eleven days against a thirty-day
 * window happened" are different findings, and only the second one can be judged.
 */
it("shows how far outside the rule the lot actually was", () => {
  renderPage();

  expect(screen.getByText(/11 days left/)).toBeInTheDocument();
  expect(screen.getByText(/window 30 days/)).toBeInTheDocument();
});

/**
 * Route access derives from the navigation model — an unregistered route
 * redirects to /access-denied — so the nav entry is part of the surface, not
 * decoration around it.
 */
it("is registered in inventory navigation under the key the endpoint requires", () => {
  const routes = INVENTORY_NAV_GROUPS.flatMap((group) => group.routes).flatMap(
    (route) => route.children ?? [route],
  );
  const entry = routes.find(
    (route) => route.href === "/inventory/reports/allocation-overrides",
  );

  expect(entry).toBeDefined();
  expect(entry?.requiredPermission).toBe("inventory:audit:read");
});
