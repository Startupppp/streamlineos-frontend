import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Driving the inventory forms' entity pickers.
 *
 * These are not `<select>` elements, and — the part that decides how they have
 * to be addressed — they have no accessible name. `WarehouseSelect`,
 * `LocationSelect` and `ProductVariantCombobox` render a `role="combobox"`
 * trigger whose visible placeholder is CONTENT, and a combobox does not take
 * its name from content. The accessibility snapshot of the New Stock Adjustment
 * sheet reads:
 *
 *     - combobox: Select warehouse…             <- no name
 *     - combobox "Direction *": In (Add stock)  <- named, a Radix Select
 *
 * so `getByRole("combobox", { name: "Warehouse" })` matches nothing. All three
 * components already accept an `ariaLabel` prop for exactly this and no call
 * site passes it; when that is fixed this helper collapses to a name lookup and
 * this comment goes with it.
 *
 * Until then they are scoped by their FormItem, which is the label the field
 * actually shows. Matching the trigger on its own text instead is a trap worth
 * naming: the placeholder is the thing that changes when a choice is made, so a
 * locator defined by it stops matching the moment it succeeds, and the
 * post-condition fails with "element(s) not found" — which reads as a broken
 * selector rather than as a working one.
 */

/**
 * The trigger for one picker, found by the visible label above it.
 *
 * `label` is anchored by the caller (`/^Location/`) because the same sheet can
 * hold "Location" and "Scrap Location", and a loose match would take whichever
 * came first.
 */
function pickerFor(scope: Page | Locator, label: RegExp): Locator {
  return scope
    .locator('[data-slot="form-item"]')
    .filter({ has: scope.page().getByText(label) })
    .getByRole("combobox")
    .first();
}

/**
 * The trigger ships `disabled` while its list loads, and Playwright's
 * actionability check treats a disabled button as "not ready yet" and waits
 * until the timeout — then reports a MISSING control rather than a slow one.
 * Waiting for enablement explicitly makes that its own, readable assertion.
 */
async function openPicker(scope: Page | Locator, label: RegExp): Promise<Locator> {
  const control = pickerFor(scope, label);
  await expect(control).toBeEnabled({ timeout: 20_000 });
  await control.click();
  return control;
}

/** Options are portalled to the body, so they are addressed from the page. */
function pageOf(scope: Page | Locator): Page {
  return "page" in scope ? (scope.page() as Page) : (scope as Page);
}

export async function chooseFromCombobox(
  scope: Page | Locator,
  label: RegExp,
  option: string | RegExp,
): Promise<void> {
  const control = await openPicker(scope, label);

  const choice = pageOf(scope).getByRole("option", { name: option }).first();
  await expect(choice).toBeVisible({ timeout: 20_000 });
  await choice.click();

  await expect(control).toContainText(option);
}

/** The first option, for fields where which one is chosen does not matter. */
export async function chooseFirstOption(
  scope: Page | Locator,
  label: RegExp,
): Promise<string> {
  const control = await openPicker(scope, label);

  const first = pageOf(scope).getByRole("option").first();
  await expect(first).toBeVisible({ timeout: 20_000 });

  // The trigger renders the option's primary label only, while the option row
  // also carries a sublabel ("SKU: …") on its own line. Comparing against the
  // first line keeps the post-condition honest without asserting the sublabel
  // onto a trigger that never shows it.
  const label0 = (await first.innerText()).trim();
  const primary = label0.split("\n")[0]?.trim() ?? label0;
  await first.click();

  // Proof the selection registered, rather than the popover merely closing.
  await expect(control).toContainText(primary);
  return primary;
}
