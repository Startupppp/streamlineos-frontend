import { expect, type Locator, type Page } from "@playwright/test";


function pickerFor(scope: Page | Locator, name: string | RegExp): Locator {
  return scope.getByRole("combobox", { name });
}

async function openPicker(scope: Page | Locator, name: string | RegExp): Promise<Locator> {
  const control = pickerFor(scope, name);
  await expect(control).toBeEnabled({ timeout: 20_000 });
  await control.click();
  return control;
}

function pageOf(scope: Page | Locator): Page {
  return "page" in scope ? scope.page() : scope;
}

export async function chooseFromCombobox(
  scope: Page | Locator,
  name: string | RegExp,
  option: string | RegExp,
): Promise<void> {
  await chooseFromComboboxBy(scope, name, option, option);
}

export async function chooseFromComboboxBy(
  scope: Page | Locator,
  name: string | RegExp,
  option: string | RegExp,
  triggerShows: string | RegExp,
): Promise<void> {
  const control = await openPicker(scope, name);

  const choice = pageOf(scope).getByRole("option", { name: option });
  await expect(
    choice,
    `"${String(option)}" must identify exactly one option; ` +
      `matching several means the wrong one can be chosen without the trigger disagreeing`,
  ).toHaveCount(1, { timeout: 20_000 });
  await choice.click();

  await expect(control).toContainText(triggerShows);
}

export async function chooseFirstOption(
  scope: Page | Locator,
  name: string | RegExp,
): Promise<string> {
  const control = await openPicker(scope, name);

  const first = pageOf(scope).getByRole("option").first();
  await expect(first).toBeVisible({ timeout: 20_000 });

  const label0 = (await first.innerText()).trim();
  const primary = label0.split("\n")[0]?.trim() ?? label0;
  await first.click();

  await expect(control).toContainText(primary);
  return primary;
}
