import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders, axeViolationIds, atViewport } from "@/test-utils";
import { Combobox } from "@/components/ui/combobox";
import { CreateAdjustmentSheet } from "./create-adjustment-sheet";


const mutate = jest.fn();

jest.mock("@/hooks/api/inventory/stock", () => ({
  ...jest.requireActual("@/hooks/api/inventory/stock"),
  useCreateAdjustment: () => ({ mutate, isPending: false }),
}));

jest.mock("@/hooks/api/inventory/warehouses", () => ({
  ...jest.requireActual("@/hooks/api/inventory/warehouses"),
  useWarehouses: () => ({
    data: { items: [{ id: 1, name: "Central DC", code: "CDC" }], total: 1, page: 1, totalPages: 1 },
    isLoading: false,
  }),
  useLocations: () => ({
    data: [
      { id: 10, name: "A-01-01", code: "A0101", locationType: "BIN", isActive: true },
      { id: 11, name: "Scrap bay", code: "SCR", locationType: "SCRAP", isActive: true },
    ],
    isLoading: false,
  }),
}));

jest.mock("@/hooks/api/inventory/products", () => ({
  ...jest.requireActual("@/hooks/api/inventory/products"),
  useProductVariants: () => ({
    data: [{ id: 42, productId: 1, productName: "Desk lamp", name: "Black", sku: "LAMP-BLK", isActive: true }],
    isLoading: false,
  }),
}));

const ALWAYS_VISIBLE_PICKERS = ["Warehouse", "Location", "Product Variant"] as const;

beforeEach(() => {
  mutate.mockReset();
});

describe("the New Stock Adjustment sheet · accessible names on the entity pickers", () => {
  it("names every picker, so each is reachable by the label the operator reads", () => {
    renderWithProviders(<CreateAdjustmentSheet open onOpenChange={jest.fn()} />);

    for (const name of ALWAYS_VISIBLE_PICKERS)
      expect(screen.getByRole("combobox", { name })).toBeInTheDocument();

    expect(screen.getByRole("combobox", { name: "Direction *" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Reason *" })).toBeInTheDocument();

    for (const control of screen.getAllByRole("combobox"))
      expect(control).toHaveAccessibleName();
  });

  it("has no axe violations at 1280px", async () => {
    const { baseElement } = renderWithProviders(
      <CreateAdjustmentSheet open onOpenChange={jest.fn()} />,
    );
    await expect(axeViolationIds(baseElement)).resolves.toEqual([]);
  });

  it("has no axe violations at 375px", async () => {
    const restore = atViewport("mobile");
    try {
      const { baseElement } = renderWithProviders(
        <CreateAdjustmentSheet open onOpenChange={jest.fn()} />,
      );
      await expect(axeViolationIds(baseElement)).resolves.toEqual([]);
    } finally {
      restore();
    }
  });

  it("names the scrap-location picker the write-off branch adds", async () => {
    const { baseElement } = renderWithProviders(
      <CreateAdjustmentSheet open onOpenChange={jest.fn()} />,
    );

    fireEvent.keyDown(screen.getByRole("combobox", { name: "Reason *" }), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: /Scrap \/ Write-off/ }));

    const scrap = await waitFor(() =>
      screen.getByRole("combobox", { name: "Scrap Location" }),
    );
    expect(scrap).toBeInTheDocument();

    for (const control of screen.getAllByRole("combobox"))
      expect(control).toHaveAccessibleName();

    await expect(axeViolationIds(baseElement)).resolves.toEqual([]);
  });

  it("BITE PROOF — a combobox trigger with visible text but no accessible name does violate button-name", async () => {
    const { baseElement } = renderWithProviders(
      <button type="button" role="combobox" aria-expanded={false}>
        <span>Select warehouse…</span>
      </button>,
    );
    await expect(axeViolationIds(baseElement)).resolves.toEqual(["button-name"]);
  });

  it("cannot reproduce that defect through Combobox itself, because the trigger now falls back to its placeholder for a name", async () => {
    const { baseElement } = renderWithProviders(
      <Combobox
        options={[{ value: "1", label: "Central DC" }]}
        value=""
        onChange={jest.fn()}
        placeholder="Select warehouse…"
      />,
    );
    expect(screen.getByRole("combobox")).toHaveAccessibleName("Select warehouse…");
    await expect(axeViolationIds(baseElement)).resolves.toEqual([]);
  });
});
