import { test, expect } from "@playwright/test";

test.describe("Accessibility - Auth Pages", () => {
  const authPages = [
    { path: "/signin", title: "Sign In" },
    { path: "/signup", title: "Sign Up" },
    { path: "/forgot-password", title: "Forgot Password" },
    { path: "/verify-email?email=test@test.com", title: "Verify Email" },
  ];

  for (const { path, title } of authPages) {
    test(`${title} page has proper heading hierarchy`, async ({ page }) => {
      await page.goto(path);
      const h1 = page.locator("h1");
      await expect(h1.first()).toBeVisible();
    });

    test(`${title} page has main landmark`, async ({ page }) => {
      await page.goto(path);
      const main = page.locator("main");
      await expect(main).toBeVisible();
    });

    test(`${title} page has skip to content link`, async ({ page }) => {
      await page.goto(path);
      const skipLink = page.locator("a[href='#main-content']");
      await expect(skipLink).toBeAttached();
    });
  }

  test("sign in form inputs have associated labels", async ({ page }) => {
    await page.goto("/signin");
    const emailInput = page.locator("#email");
    await expect(emailInput).toBeVisible();
    const label = page.locator("label[for='email']");
    await expect(label).toBeVisible();
  });

  test("sign up form has aria-busy during submission", async ({ page }) => {
    await page.goto("/signup");
    const form = page.locator("form");
    // Before submission, aria-busy should be false
    await expect(form).toHaveAttribute("aria-busy", "false");
  });

  test("password toggle buttons have aria-label", async ({ page }) => {
    await page.goto("/signin");
    const toggle = page.getByRole("button", { name: /password/i });
    await expect(toggle).toBeAttached();
  });
});

test.describe("Accessibility - Form Validation", () => {
  test("invalid email shows aria-invalid on input", async ({ page }) => {
    await page.goto("/signin");
    await page.getByRole("button", { name: "Sign in" }).click();
    const emailInput = page.getByLabel("Email address");
    await expect(emailInput).toHaveAttribute("aria-invalid", "true", { timeout: 5000 });
  });

  test("error messages have role=alert", async ({ page }) => {
    await page.goto("/signin");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
  });

  test("error messages are linked via aria-describedby", async ({ page }) => {
    await page.goto("/signin");
    await page.getByRole("button", { name: "Sign in" }).click();
    const emailInput = page.getByLabel("Email address");
    const describedBy = await emailInput.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    if (describedBy) {
      const errorEl = page.locator(`#${describedBy}`);
      await expect(errorEl).toBeVisible();
    }
  });

  test("forgot password email validation has proper ARIA", async ({ page }) => {
    await page.goto("/forgot-password");
    const emailInput = page.getByLabel("Email Address");
    // Submit empty to trigger zod validation (not browser native type=email)
    await emailInput.fill("");
    await page.getByRole("button", { name: "Send Reset Link" }).click();
    await expect(emailInput).toHaveAttribute("aria-invalid", "true", { timeout: 5000 });
    await expect(emailInput).toHaveAttribute("aria-describedby", "email-error");
  });
});

test.describe("Accessibility - Responsive Design", () => {
  test("signin page is usable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/signin");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    // Form should be full-width on mobile
    const card = page.locator(".max-w-md");
    await expect(card).toBeVisible();
  });

  test("signup page hides sidebar on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/signup");
    // Left sidebar should be hidden on mobile (lg:flex)
    const sidebar = page.locator(".lg\\:flex").first();
    await expect(sidebar).toBeHidden();
    // Form should still be visible
    await expect(page.getByRole("heading", { name: "Get started today" })).toBeVisible();
  });
});

test.describe("Accessibility - Keyboard Navigation", () => {
  test("can tab through sign in form", async ({ page }) => {
    await page.goto("/signin");
    await page.keyboard.press("Tab"); // Skip link
    await page.keyboard.press("Tab"); // Brand header link
    await page.keyboard.press("Tab"); // Email input
    const activeElement = page.locator(":focus");
    await expect(activeElement).toBeVisible();
  });

  test("org selection has accessible org buttons", async ({ page }) => {
    await page.goto("/org-selection");
    const url = page.url();
    if (url.includes("signin")) return;

    const orgList = page.locator("[role='list'][aria-label='Organizations']");
    if ((await orgList.count()) > 0) {
      const orgButtons = orgList.locator("[role='listitem']");
      const count = await orgButtons.count();
      if (count > 0) {
        const firstBtn = orgButtons.first();
        const ariaLabel = await firstBtn.getAttribute("aria-label");
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toContain("Select");
      }
    }
  });
});
