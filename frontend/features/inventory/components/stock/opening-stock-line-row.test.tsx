import { fireEvent, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { renderWithProviders } from "@/test-utils";
import { LineRow } from "./opening-stock-line-row";
import { defaultLine, type FormValues } from "./opening-stock-schema";

const useLocations = jest.fn();

jest.mock("@/components/inventory/product-variant-combobox", () => ({
  ProductVariantCombobox: () => <div>Variant picker</div>,
}));

jest.mock("@/hooks/api/inventory/warehouses", () => ({
  useLocations: (warehouseId: number) => useLocations(warehouseId),
}));

function StockLineHarness() {
  const form = useForm<FormValues>({ defaultValues: { lines: [defaultLine()], notes: "" } });

  return (
    <LineRow
      index={0}
      control={form.control}
      register={form.register}
      setValue={form.setValue}
      errors={form.formState.errors}
      onRemove={jest.fn()}
      canRemove={false}
      warehouses={[{ id: 7, name: "Calendar QA warehouse" }]}
    />
  );
}

it("enables locations and loads the selected warehouse after the warehouse changes", async () => {
  useLocations.mockImplementation((warehouseId: number) => ({
    data: warehouseId === 7 ? [{ id: 17, name: "Main", code: "MAIN" }] : [],
  }));

  renderWithProviders(<StockLineHarness />);

  const [warehouse, location] = screen.getAllByRole("combobox");
  expect(location).toBeDisabled();
  expect(useLocations).toHaveBeenCalledWith(0);

  fireEvent.keyDown(warehouse, { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name: "Calendar QA warehouse" }));

  expect(location).toBeEnabled();
  expect(useLocations).toHaveBeenCalledWith(7);

  fireEvent.keyDown(location, { key: "ArrowDown" });
  expect(await screen.findByRole("option", { name: "Main (MAIN)" })).toBeInTheDocument();
});
