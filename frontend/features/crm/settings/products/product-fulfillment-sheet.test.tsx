import { render, screen } from "@testing-library/react";
import type { OfferFulfillmentComponent } from "@/hooks/api/crm/offer-fulfillment-schema";
import type { Product } from "@/types/crm/products";
import { ProductFulfillmentSheet } from "./product-fulfillment-sheet";

const mockCan = jest.fn();
const mockMappings = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockCan(key),
}));
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: ({ isEmpty }: { isEmpty: boolean }) => ({ kind: isEmpty ? "empty" : "ready" }),
}));
jest.mock("@/hooks/api/inventory/products", () => ({
  useProductVariants: () => ({
    data: [{ id: 41, productId: 4, productName: "Router", name: "Black", sku: "RT-BLK", costPrice: "0", isActive: true }],
    isLoading: false,
  }),
}));
jest.mock("@/hooks/api/crm/offer-fulfillment", () => ({
  useOfferFulfillmentMappings: (filters: unknown) => mockMappings(filters),
  useCreateOfferFulfillmentMapping: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateOfferFulfillmentMapping: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteOfferFulfillmentMapping: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const product: Product = {
  id: 9,
  orgId: "org-1",
  name: "Home internet",
  description: null,
  sku: null,
  category: null,
  unitPrice: 0,
  currency: "USD",
  taxRate: 0,
  isActive: true,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

const mapping: OfferFulfillmentComponent = {
  offerFulfillmentComponentId: 3,
  orgId: "org-1",
  crmOfferId: 9,
  crmOfferOrgId: "org-1",
  invSkuId: 41,
  invSkuOrgId: "org-1",
  quantityPerUnit: "2.0000",
  uom: "each",
  status: "active",
  effectiveFrom: null,
  effectiveTo: null,
  notes: null,
  createdBy: "user-1",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

describe("ProductFulfillmentSheet", () => {
  const allow = (keys: string[]) => mockCan.mockImplementation((k: string) => keys.includes(k));

  beforeEach(() => {
    mockMappings.mockReturnValue({
      data: { pages: [{ data: [mapping], pagination: { limit: 20, hasMore: false, nextCursor: null } }] },
      isLoading: false,
      isError: false,
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
    });
  });

  it("lists this product's mappings by variant name, with quantity and unit", () => {
    allow(["crm:offer-fulfillment:view"]);
    render(<ProductFulfillmentSheet product={product} onOpenChange={jest.fn()} />);
    expect(mockMappings).toHaveBeenCalledWith({ crmOfferId: 9 });
    expect(screen.getByText("Router — Black")).toBeInTheDocument();
    const quantity = screen.getByText("2");
    expect(quantity).toHaveClass("tabular-nums");
    expect(quantity.parentElement).toHaveTextContent("SKU RT-BLK · 2 each");
  });

  it("offers add, toggle, edit and delete only to a caller holding those keys", () => {
    allow([
      "crm:offer-fulfillment:view",
      "crm:offer-fulfillment:create",
      "crm:offer-fulfillment:update",
      "crm:offer-fulfillment:delete",
    ]);
    render(<ProductFulfillmentSheet product={product} onOpenChange={jest.fn()} />);
    expect(screen.getByRole("button", { name: /add mapping/i })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Deactivate Router — Black" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Router — Black" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Router — Black" })).toBeInTheDocument();
  });

  it("hides every mutation control from a view-only caller", () => {
    allow(["crm:offer-fulfillment:view"]);
    render(<ProductFulfillmentSheet product={product} onOpenChange={jest.fn()} />);
    expect(screen.queryByRole("button", { name: /add mapping/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit|delete/i })).not.toBeInTheDocument();
  });
});
