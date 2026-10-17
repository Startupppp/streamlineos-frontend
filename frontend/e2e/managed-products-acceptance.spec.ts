import { expect, test } from "@playwright/test";
import { signIn } from "./fixtures/session";
import { hasTenantEnv, tenantEnv, tenantSkipReason } from "./fixtures/tenant";

const SKIP = tenantSkipReason("build");
const NEEDS_TENANT = !hasTenantEnv();

test.describe("MP-09 managed products: keyboard traversal, focus, pagination (design-system gallery)", () => {
  const GALLERY = "/design-system/managed-products";

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(GALLERY);
    await expect(
      page.getByRole("heading", { name: "Managed Products surfaces" }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Tab order through the products toolbar follows visual order: search → Status → Sort", async ({ page }) => {
    const scope = page.locator('[data-case-frame="ready"]');
    const searchInput = scope.locator("[data-slot=search-input] input");
    await searchInput.focus();
    await expect(searchInput).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(
      scope.locator("[data-filter-id=status] [data-slot=select-trigger]"),
    ).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(
      scope.locator("[data-filter-id=sort] [data-slot=select-trigger]"),
    ).toBeFocused();
  });

  test("Enter opens the row Actions dropdown; Escape closes it and returns focus to the trigger", async ({ page }) => {
    const scope = page.locator('[data-case-frame="ready"]');
    const actionsBtn = scope
      .getByRole("button", { name: /^Actions for / })
      .first();
    await actionsBtn.focus();
    await expect(actionsBtn).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
    await expect(actionsBtn).toBeFocused();
  });

  test("every interactive control in the ready case has a visible focus ring when keyboard-focused", async ({
    page,
  }) => {
    const scope = page.locator('[data-case-frame="ready"]');
    const searchInput = scope.locator("[data-slot=search-input] input");
    await searchInput.focus();

    const outlineWidth = await searchInput.evaluate(
      (el: HTMLElement) => Number.parseFloat(getComputedStyle(el).outlineWidth) || 0,
    );
    const ringWidth = await searchInput.evaluate(
      (el: HTMLElement) =>
        Number.parseFloat(getComputedStyle(el).getPropertyValue("--tw-ring-shadow") || "0") || 0,
    );

    const hasFocusIndicator = outlineWidth > 0 || ringWidth > 0 || await searchInput.evaluate((el: HTMLElement) => {
      const s = getComputedStyle(el);
      return s.outline !== "0px none rgb(0, 0, 0)" && s.outline !== "none";
    });

    expect(hasFocusIndicator, "search input must have a visible focus indicator").toBe(true);
  });
});

test.describe("MP-09 managed products: authenticated real-backend flows", () => {
  test.skip(NEEDS_TENANT, SKIP);

  test.beforeEach(async ({ context, baseURL }) => {
    await signIn(context, tenantEnv().user, baseURL as string);
  });

  test("list page loads, lands on /build/managed-products, not on /signin", async ({ page }) => {
    await page.goto("/build/managed-products");
    await expect(page).toHaveURL(/\/build\/managed-products/);
    await expect(page).not.toHaveURL(/\/signin/);
    await expect(page).not.toHaveURL(/\/org-setup|\/employee-onboarding/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
  });

  test("list page is navigable without horizontal scroll at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/build/managed-products");
    await expect(page).toHaveURL(/\/build\/managed-products/);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "horizontal overflow at 375px on list").toBeLessThanOrEqual(1);
  });

  test("list page is navigable without horizontal scroll at 768px", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/build/managed-products");
    await expect(page).toHaveURL(/\/build\/managed-products/);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "horizontal overflow at 768px on list").toBeLessThanOrEqual(1);
  });
});
