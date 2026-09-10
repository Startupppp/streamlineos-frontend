import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders, axeViolationIds, atViewport } from "@/test-utils";
import { Combobox } from "@/components/ui/combobox";
import { CreateAdjustmentSheet } from "./create-adjustment-sheet";

/**
 * The inventory entity pickers have accessible names, and axe agrees.
 *
 * `WarehouseSelect`, `LocationSelect` and `ProductVariantCombobox` render a
 * `role="combobox"` trigger. That role prohibits name-from-content, so the
 * placeholder each one shows ("Select warehouse…") was never a name: every one
 * of them was an anonymous control, and the accessibility snapshot of this very
 * sheet read `combobox: Select warehouse…` beside correctly-named siblings
 * (`combobox "Direction *"`). All three accepted nothing to fix it with, or in
 * one case accepted an `ariaLabel` no call site passed.
 *
 * Two halves hold it closed now and they catch different things.
 *
 * `ariaLabel` is a REQUIRED prop on all three components, so a call site that
 * omits it does not compile — that is what covers all twenty of them, including
 * ones nothing mounts. What a type cannot check is whether the prop still
 * reaches the DOM: `Combobox` spreads `aria-label` conditionally, and a
 * refactor that dropped that spread would leave every call site compiling and
 * every trigger anonymous. That is this file's job.
 *
 * It is deliberately an assertion about the RENDERED tree rather than about
 * sources. `create-adjustment-sheet.tsx` is the sheet the defect was measured
 * in, and it is the densest instance — four pickers plus two Radix Selects in
 * one form — so a name that stops arriving shows up here first.
 */

const mutate = jest.fn();

jest.mock("@/hooks/api/inventory/stock", () => ({
  ...jest.requireActual("@/hooks/api/inventory/stock"),
  useCreateAdjustment: () => ({ mutate, isPending: false }),
}));

jest.mock("@/hooks/api/inventory/warehouses", () => ({
  ...jest.requireActual("@/hooks/api/inventory/warehouses"),
  useWarehouses: () => ({
    data: [{ id: 1, name: "Central DC", code: "CDC" }],
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

/**
 * The names the sheet's own `FormLabel`s show, minus the required asterisk.
 *
 * Not the asterisk: it is `<span className="text-destructive">*</span>` beside
 * the label, decoration for a rule the form states in its error message, and
 * reading "Warehouse star" to somebody is worse than reading "Warehouse".
 */
const ALWAYS_VISIBLE_PICKERS = ["Warehouse", "Location", "Product Variant"] as const;

beforeEach(() => {
  mutate.mockReset();
});

describe("the New Stock Adjustment sheet · accessible names on the entity pickers", () => {
  it("names every picker, so each is reachable by the label the operator reads", () => {
    renderWithProviders(<CreateAdjustmentSheet open onOpenChange={jest.fn()} />);

    for (const name of ALWAYS_VISIBLE_PICKERS)
      expect(screen.getByRole("combobox", { name })).toBeInTheDocument();

    // The two Radix Selects beside them were already named and stay that way —
    // a regression that "fixed" the pickers by renaming the whole form would
    // otherwise pass.
    expect(screen.getByRole("combobox", { name: "Direction *" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Reason *" })).toBeInTheDocument();

    // And nothing in the sheet is an unnamed combobox. The loop above proves
    // three names exist; this proves there is no fourth control without one,
    // which is the failure a per-name list cannot see.
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

  /**
   * The write-off branch, which mounts a FOURTH picker.
   *
   * Scrap Location renders only for a condemning reason, so the three tests
   * above never see it — and it is the picker most likely to be missed, being
   * the one that is not on screen when somebody reads the form.
   *
   * The reason Select is driven by keyboard rather than by clicking: Radix
   * Select's pointer path needs `hasPointerCapture`, which jsdom does not
   * implement, and a click therefore opens nothing and fails as a missing
   * option.
   */
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

  /**
   * BITE PROOF — the green above is earned, not structural.
   *
   * `button-name` does not fire for every unnamed control: axe's own matcher
   * excludes a `<button>` carrying an explicit role from `aria-input-field-name`
   * and back again, so "axe is clean" would mean nothing if the rule simply did
   * not apply to this markup. It does: the same trigger without `ariaLabel`
   * violates `button-name` even though it renders visible text.
   *
   * This is what makes the three empty-array assertions above assertions rather
   * than restatements of axe's silence. It is the raw `Combobox` because the
   * three wrappers now REQUIRE the prop — reproducing the original defect
   * through them is a type error, which is the point.
   */
  it("BITE PROOF — an unnamed combobox trigger does violate button-name", async () => {
    const { baseElement } = renderWithProviders(
      <Combobox
        options={[{ value: "1", label: "Central DC" }]}
        value=""
        onChange={jest.fn()}
        placeholder="Select warehouse…"
      />,
    );
    await expect(axeViolationIds(baseElement)).resolves.toEqual(["button-name"]);
  });
});
