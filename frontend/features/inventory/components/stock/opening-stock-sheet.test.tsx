import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { OpeningStockSheet } from "./opening-stock-sheet";

jest.mock("@/components/inventory/product-variant-combobox", () => ({
  ProductVariantCombobox: () => <div>Variant picker</div>,
}));

jest.mock("@/hooks/api/inventory/products", () => ({
  useProductVariants: () => ({ data: [{ id: 1 }], isLoading: false }),
}));

jest.mock("@/hooks/api/inventory/warehouses", () => ({
  useWarehouses: () => ({ data: { items: [{ id: 7, name: "Calendar QA warehouse" }] } }),
  useLocations: () => ({ data: [] }),
}));

jest.mock("@/hooks/api/inventory/stock", () => ({
  useOpeningStock: () => ({ mutate: jest.fn(), isPending: false }),
}));

it("updates the opening stock quantity summary as the quantity changes", () => {
  renderWithProviders(<OpeningStockSheet open onOpenChange={jest.fn()} />);

  const summary = screen.getByText("Total Qty").parentElement;
  expect(summary).toHaveTextContent("0");

  fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "2" } });

  expect(summary).toHaveTextContent("2");
});
