import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { CostingClient } from "./costing-client";


jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/inventory/costing",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("@/hooks/api/org-display", () => ({
  useOrgDisplay: () => ({ currency: "INR", locale: "en-IN" }),
}));

const useCostingProducts = jest.fn();

jest.mock("@/hooks/api/inventory/valuation", () => ({
  useCostingProducts: (params: unknown) => useCostingProducts(params) as unknown,
}));

beforeEach(() => {
  useCostingProducts.mockReturnValue({
    data: {
      items: [
        {
          id: 7,
          productId: 3,
          productName: "Copper wire 2.5mm",
          name: "100m reel",
          sku: "SKU-7",
          costPrice: "246.9000",
          isActive: true,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  });
});

it("renders the catalogue row the variants endpoint answers", () => {
  renderWithProviders(<CostingClient />);

  expect(screen.getByText("Copper wire 2.5mm")).toBeInTheDocument();
  expect(screen.getByText("SKU-7")).toBeInTheDocument();
  expect(screen.getByText("100m reel")).toBeInTheDocument();
  expect(screen.getByText("₹246.90")).toBeInTheDocument();
});

it("asks the strict query for a page of active variants and nothing else", () => {
  renderWithProviders(<CostingClient />);

  expect(useCostingProducts).toHaveBeenCalledWith({
    activeOnly: true,
    page: 1,
    limit: 20,
  });
});
