import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("serves the sign-in page with a form that actually rendered", async ({
    page,
  }) => {
    const response = await page.goto("/signin");

    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole("heading", { name: "Sign in or create an account" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  test("runs its client-side validation, which proves React hydrated", async ({
    page,
  }) => {
    await page.goto("/signin");

    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Continue" }).click();

    const fieldError = page.locator("#email-error");
    await expect(fieldError).toHaveText("Please enter a valid email");

    await expect(fieldError).toHaveRole("alert");
  });

  test("sends an unauthenticated visitor from an inventory route to sign-in, keeping the destination", async ({
    page,
  }) => {
    await page.goto("/inventory/stock");

    await expect(page).toHaveURL(/\/signin\?/);

    expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe(
      "/inventory/stock",
    );
  });

  test("does not leak an inventory page's content while redirecting", async ({
    page,
  }) => {
    const response = await page.goto("/inventory/rf");

    expect(response?.url()).toContain("/signin");
    await expect(page.getByLabel("Email")).toBeVisible();
  });
});
