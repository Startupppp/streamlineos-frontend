import { test, expect } from "@playwright/test";

// These tests verify unauthenticated redirect behaviour only.
// Authenticated flow tests require storageState session fixtures (see
// tests/e2e/fixtures/authenticated.setup.ts for future implementation).

test.describe("Leads page — unauthenticated access", () => {
  test("redirects to login when visiting /crm/leads without a session", async ({ page }) => {
    await page.goto("/crm/leads");
    await expect(page).toHaveURL(/sign-in|signin|login/);
  });

  test("redirects to login when visiting /crm/leads/board without a session", async ({
    page,
  }) => {
    await page.goto("/crm/leads/board");
    await expect(page).toHaveURL(/sign-in|signin|login/);
  });
});

test.describe("Dashboard — unauthenticated access", () => {
  test("redirects /dashboard to login for unauthenticated users", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/sign-in|signin|login/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated tests — skipped until auth storage state fixtures are set up.
// Uncomment and implement storageState after running:
//   pnpm exec playwright codegen http://localhost:3000/sign-in
// ─────────────────────────────────────────────────────────────────────────────

// test.describe("Leads page — authenticated", () => {
//   test.use({ storageState: "tests/e2e/fixtures/auth-state.json" });
//
//   test("renders the leads list table", async ({ page }) => {
//     await page.goto("/crm/leads");
//     await expect(page.getByRole("table")).toBeVisible();
//   });
//
//   test("opens create-lead dialog when clicking New Lead button", async ({ page }) => {
//     await page.goto("/crm/leads");
//     await page.getByRole("button", { name: /new lead/i }).click();
//     await expect(page.getByRole("dialog")).toBeVisible();
//   });
// });
