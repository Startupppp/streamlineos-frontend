import { expect, test } from "@playwright/test";

test.describe("signin", () => {
  test("serves the sign-in page with a usable form", async ({ page }) => {
    const response = await page.goto("/signin");

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/sign in/i);

    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Continue", exact: true }),
    ).toBeVisible();
  });

  test("sends an unauthenticated visitor from a private route to sign-in, and remembers where they were going", async ({
    page,
  }) => {
    await page.goto("/crm");

    await expect(page).toHaveURL(/\/signin\?/);

    const callbackUrl = new URL(page.url()).searchParams.get("callbackUrl");
    expect(callbackUrl).toBe("/crm");
  });

  test("does not leak a private page's content while redirecting", async ({ page }) => {
    const response = await page.goto("/settings");

    expect(response?.url()).toContain("/signin");
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  });
});
