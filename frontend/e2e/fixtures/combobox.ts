import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Driving the inventory forms' entity pickers.
 *
 * `WarehouseSelect`, `LocationSelect` and `ProductVariantCombobox` are not
 * `<select>` elements — each renders a `role="combobox"` trigger over a Radix
 * popover — so they are addressed by their accessible name, the `ariaLabel`
 * every call site now passes.
 *
 * They previously had no name at all: a combobox does not take its name from
 * content, so the visible placeholder ("Select warehouse…") was content and the
 * trigger was anonymous, which is why this helper used to reach them through the
 * `FormItem` wrapping their `FormLabel`. The name lookup is the better address
 * for the reason that made the old one necessary — it asks for the thing a
 * screen reader would ask for, so a regression in the name fails this suite
 * rather than passing it on a DOM coincidence.
 *
 * Matching a trigger on its own TEXT is still the trap, and it is why the
 * post-conditions below assert the chosen option instead of re-finding the
 * control: the placeholder is what changes when a choice is made, so a locator
 * defined by it stops matching the moment it succeeds and fails with
 * "element(s) not found" — which reads as a broken selector rather than a
 * working one.
 */

/** The trigger for one picker, by its accessible name. */
function pickerFor(scope: Page | Locator, name: string | RegExp): Locator {
  return scope.getByRole("combobox", { name });
}

/**
 * The trigger ships `disabled` while its list loads, and Playwright's
 * actionability check treats a disabled button as "not ready yet" and waits
 * until the timeout — then reports a MISSING control rather than a slow one.
 * Waiting for enablement explicitly makes that its own, readable assertion.
 */
async function openPicker(scope: Page | Locator, name: string | RegExp): Promise<Locator> {
  const control = pickerFor(scope, name);
  await expect(control).toBeEnabled({ timeout: 20_000 });
  await control.click();
  return control;
}

/** Options are portalled to the body, so they are addressed from the page. */
function pageOf(scope: Page | Locator): Page {
  return "page" in scope ? scope.page() : scope;
}

export async function chooseFromCombobox(
  scope: Page | Locator,
  name: string | RegExp,
  option: string | RegExp,
): Promise<void> {
  const control = await openPicker(scope, name);

  const choice = pageOf(scope).getByRole("option", { name: option }).first();
  await expect(choice).toBeVisible({ timeout: 20_000 });
  await choice.click();

  await expect(control).toContainText(option);
}

/** The first option, for fields where which one is chosen does not matter. */
export async function chooseFirstOption(
  scope: Page | Locator,
  name: string | RegExp,
): Promise<string> {
  const control = await openPicker(scope, name);

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
