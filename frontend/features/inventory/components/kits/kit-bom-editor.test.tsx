import { fireEvent, screen, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { renderWithProviders, axeViolationIds } from "@/test-utils";
import { KitBomEditorSheet } from "./kit-bom-editor-sheet";
import KitsPage from "@/app/(authenticated)/inventory/kits/page";

/**
 * A kit's bill of materials could be read and never written.
 *
 * The page's own empty state said "Set them on the product, then come back" —
 * pointing at a screen that does not exist. `PUT
 * /inventory/kits/:kitVariantId/bom` was mounted, carried
 * `inventory:products:update`, and `useSetKitBom` was referenced by nothing, so
 * every kit in the product was one somebody had inserted by hand.
 */

const mockSetBomMutate = jest.fn();
let mockSetBomPending = false;
let mockCan: Record<string, boolean> = {};
let mockBom: Array<{ id: number; componentVariantId: number; quantityPer: string; lineOrder: number }> = [];

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/inventory/kits",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan[key] ?? false }));

jest.mock("@/hooks/api/inventory/stock-types-dock", () => ({
  ...jest.requireActual("@/hooks/api/inventory/stock-types-dock"),
  useKitBom: () => ({ data: mockBom, isLoading: false, isError: false, refetch: jest.fn() }),
  useKitBuildable: () => ({ data: undefined, refetch: jest.fn() }),
  useAssembleKit: () => ({ mutate: jest.fn(), isPending: false }),
  useSetKitBom: () => ({ mutate: mockSetBomMutate, isPending: mockSetBomPending }),
}));

jest.mock("@/hooks/api/inventory/products", () => ({
  ...jest.requireActual("@/hooks/api/inventory/products"),
  useProductVariants: () => ({
    data: [
      { id: 42, productId: 1, productName: "Desk lamp", name: "Black", sku: "LAMP-BLK", costPrice: "0", isActive: true },
      { id: 43, productId: 2, productName: "Bulb", name: "9W", sku: "BULB-9", costPrice: "0", isActive: true },
    ],
    isLoading: false,
  }),
}));

const READ = "inventory:products:read";
const UPDATE = "inventory:products:update";

beforeEach(() => {
  mockSetBomMutate.mockReset();
  mockSetBomPending = false;
  mockCan = { [READ]: true, [UPDATE]: true };
  mockBom = [{ id: 1, componentVariantId: 43, quantityPer: "2", lineOrder: 1 }];
});

describe("editing a kit's bill of materials", () => {
  it("reaches the editor from the kits page", () => {
    renderWithProviders(
      <TooltipProvider>
        <KitsPage />
      </TooltipProvider>,
    );
    fireEvent.change(screen.getByLabelText(/kit variant id/i), { target: { value: "42" } });
    expect(screen.getByRole("button", { name: /edit components/i })).toBeInTheDocument();
  });

  it("offers to set components when the kit has none, which the old copy only described", () => {
    mockBom = [];
    renderWithProviders(
      <TooltipProvider>
        <KitsPage />
      </TooltipProvider>,
    );
    fireEvent.change(screen.getByLabelText(/kit variant id/i), { target: { value: "42" } });
    expect(screen.getAllByRole("button", { name: /set components/i }).length).toBeGreaterThan(0);
  });

  it("withholds the control from a viewer who may read but not update products", () => {
    mockCan = { [READ]: true, [UPDATE]: false };
    renderWithProviders(
      <TooltipProvider>
        <KitsPage />
      </TooltipProvider>,
    );
    fireEvent.change(screen.getByLabelText(/kit variant id/i), { target: { value: "42" } });
    expect(screen.queryByRole("button", { name: /components/i })).not.toBeInTheDocument();
  });

  it("names the component instead of printing its id at a person", () => {
    renderWithProviders(
      <TooltipProvider>
        <KitsPage />
      </TooltipProvider>,
    );
    fireEvent.change(screen.getByLabelText(/kit variant id/i), { target: { value: "42" } });
    expect(screen.getByText("Bulb — 9W")).toBeInTheDocument();
    expect(screen.queryByText(/Variant #43/)).not.toBeInTheDocument();
  });

  it("sends the whole list, since the route replaces rather than merges", async () => {
    renderWithProviders(
      <KitBomEditorSheet
        open
        onOpenChange={jest.fn()}
        kitVariantId={42}
        components={[{ id: 1, componentVariantId: 43, quantityPer: "2", lineOrder: 1 }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save bill of materials/i }));
    await waitFor(() => expect(mockSetBomMutate).toHaveBeenCalledTimes(1));
    expect(mockSetBomMutate.mock.calls[0]?.[0]).toEqual({
      kitVariantId: 42,
      components: [{ componentVariantId: 43, quantityPer: "2" }],
    });
  });

  it("permits an empty list, which is how a kit stops being a kit", async () => {
    renderWithProviders(
      <KitBomEditorSheet open onOpenChange={jest.fn()} kitVariantId={42} components={[]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save bill of materials/i }));
    await waitFor(() => expect(mockSetBomMutate).toHaveBeenCalledTimes(1));
    expect(mockSetBomMutate.mock.calls[0]?.[0]).toEqual({ kitVariantId: 42, components: [] });
  });

  it("refuses a quantity of zero before it reaches the server", async () => {
    renderWithProviders(
      <KitBomEditorSheet
        open
        onOpenChange={jest.fn()}
        kitVariantId={42}
        components={[{ id: 1, componentVariantId: 43, quantityPer: "2", lineOrder: 1 }]}
      />,
    );
    fireEvent.change(screen.getByLabelText(/per kit/i), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /save bill of materials/i }));
    await waitFor(() => expect(screen.getByText(/more than zero/i)).toBeInTheDocument());
    expect(mockSetBomMutate).not.toHaveBeenCalled();
  });

  it("names which duplicate row collides rather than leaving it to one server 400", async () => {
    renderWithProviders(
      <KitBomEditorSheet
        open
        onOpenChange={jest.fn()}
        kitVariantId={42}
        components={[
          { id: 1, componentVariantId: 43, quantityPer: "2", lineOrder: 1 },
          { id: 2, componentVariantId: 43, quantityPer: "1", lineOrder: 2 },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save bill of materials/i }));
    await waitFor(() =>
      expect(screen.getByText(/already on the list/i)).toBeInTheDocument(),
    );
    expect(mockSetBomMutate).not.toHaveBeenCalled();
  });

  it("has no accessibility violations", async () => {
    const { baseElement } = renderWithProviders(
      <KitBomEditorSheet
        open
        onOpenChange={jest.fn()}
        kitVariantId={42}
        components={[{ id: 1, componentVariantId: 43, quantityPer: "2", lineOrder: 1 }]}
      />,
    );
    await expect(axeViolationIds(baseElement)).resolves.toEqual([]);
  });
});
