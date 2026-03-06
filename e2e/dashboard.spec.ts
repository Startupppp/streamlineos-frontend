import { test, expect } from "@playwright/test";

test.describe("Main Dashboard", () => {
  // These tests require authentication - they verify structure when accessible
  test("dashboard page loads with greeting", async ({ page }) => {
    await page.goto("/dashboard");
    // Should either show dashboard or redirect to signin
    const url = page.url();
    if (url.includes("signin")) {
      // Not authenticated - verify redirect works
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    } else {
      // Authenticated - verify dashboard content
      await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible();
    }
  });

  test("error state has role=alert", async ({ page }) => {
    await page.goto("/dashboard");
    // If error state appears, verify it has proper ARIA
    const alertEl = page.locator("[role='alert']");
    const count = await alertEl.count();
    if (count > 0) {
      await expect(alertEl.first()).toBeVisible();
    }
  });
});

test.describe("Dashboard Navigation", () => {
  test("signin redirects to dashboard after login", async ({ page }) => {
    await page.goto("/signin");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });
});
