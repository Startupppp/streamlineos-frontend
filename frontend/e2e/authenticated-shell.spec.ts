import { expect, test } from "@playwright/test";
import { signIn } from "./fixtures/session";
import { SKIP_REASON, hasTenantEnv, tenantEnv } from "./fixtures/tenant";

test.describe("authenticated shell", () => {
  test.skip(!hasTenantEnv(), SKIP_REASON);

  test.beforeEach(async ({ context, baseURL }) => {
    await signIn(context, tenantEnv().user, baseURL as string);
  });

  test("a minted session lands on the inventory page instead of sign-in", async ({
    page,
  }) => {
    await page.goto("/inventory/stock");

    await expect(page).toHaveURL(/\/inventory\/stock$/);
    await expect(page).not.toHaveURL(/\/signin/);

    await expect(page).not.toHaveURL(/\/org-setup|\/employee-onboarding/);
  });

  test("renders the authenticated shell, not a permission or module wall", async ({
    page,
  }) => {
    await page.goto("/inventory/stock");

    await expect(
      page.getByRole("heading", { level: 1 }).first(),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText(/no permission|access denied/i)).toHaveCount(0);
    await expect(
      page.getByText(/module is not enabled|upgrade your plan/i),
    ).toHaveCount(0);
  });
});
