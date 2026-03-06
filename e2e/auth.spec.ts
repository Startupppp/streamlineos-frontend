import { test, expect } from "@playwright/test";

test.describe("Auth Flow", () => {
  test.describe("Sign In Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/signin");
    });

    test("renders sign in form with all elements", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
      await expect(page.getByLabel("Email address")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();
      await expect(page.locator("text=Remember me")).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Sign Up" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
    });

    test("shows validation errors for empty form submission", async ({ page }) => {
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByRole("alert").first()).toBeVisible();
    });

    test("shows validation error for invalid email", async ({ page }) => {
      await page.getByLabel("Email address").fill("invalid-email");
      await page.locator("#password").fill("password");
      await page.getByRole("button", { name: "Sign in" }).click();
      // Browser native type=email validation or zod validation should prevent submission
      // The form should not navigate away
      await expect(page).toHaveURL(/signin/);
    });

    test("email input has aria-invalid when error occurs", async ({ page }) => {
      await page.getByRole("button", { name: "Sign in" }).click();
      const emailInput = page.getByLabel("Email address");
      await expect(emailInput).toHaveAttribute("aria-invalid", "true");
    });

    test("password visibility toggle works", async ({ page }) => {
      const passwordInput = page.locator("#password");
      await expect(passwordInput).toHaveAttribute("type", "password");
      await page.getByRole("button", { name: "Show password" }).click();
      await expect(passwordInput).toHaveAttribute("type", "text");
      await page.getByRole("button", { name: "Hide password" }).click();
      await expect(passwordInput).toHaveAttribute("type", "password");
    });

    test("forgot password link navigates correctly", async ({ page }) => {
      await page.getByRole("link", { name: "Forgot password?" }).click();
      await expect(page).toHaveURL(/forgot-password/);
    });

    test("sign up link navigates correctly", async ({ page }) => {
      await page.getByRole("link", { name: "Sign Up" }).click();
      await expect(page).toHaveURL(/signup/);
    });

    test("form has aria-busy attribute", async ({ page }) => {
      const form = page.locator("form");
      await expect(form).toHaveAttribute("aria-busy", "false");
    });
  });

  test.describe("Sign Up Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/signup");
    });

    test("renders sign up form with all elements", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "Get started today" })).toBeVisible();
      await expect(page.getByLabel("First Name")).toBeVisible();
      await expect(page.getByLabel("Last Name")).toBeVisible();
      await expect(page.getByLabel("Work Email")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();
      await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible();
    });

    test("shows password strength indicator when typing", async ({ page }) => {
      await page.locator("#password").fill("Aa1!");
      await expect(page.locator("#password-strength")).toBeVisible();
    });

    test("shows validation error for weak password", async ({ page }) => {
      await page.getByLabel("Work Email").fill("test@example.com");
      await page.locator("#password").fill("weak");
      await page.getByRole("button", { name: "Create Account" }).click();
      await expect(page.getByRole("alert").first()).toBeVisible();
    });

    test("email input rejects invalid email via browser validation", async ({ page }) => {
      await page.getByLabel("Work Email").fill("not-an-email");
      await page.getByRole("button", { name: "Create Account" }).click();
      // Browser native type=email validation prevents form submission
      await expect(page).toHaveURL(/signup/);
    });

    test("has security badge", async ({ page }) => {
      await expect(page.getByText("enterprise-grade SSL encryption")).toBeVisible();
    });

    test("login link navigates to signin", async ({ page }) => {
      await page.getByRole("link", { name: "Log in" }).click();
      await expect(page).toHaveURL(/signin/);
    });
  });

  test.describe("Forgot Password Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/forgot-password");
    });

    test("renders forgot password form", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "Forgot Password" })).toBeVisible();
      await expect(page.getByLabel("Email Address")).toBeVisible();
      await expect(page.getByRole("button", { name: "Send Reset Link" })).toBeVisible();
    });

    test("shows validation error for invalid email", async ({ page }) => {
      await page.getByLabel("Email Address").fill("bad");
      await page.getByRole("button", { name: "Send Reset Link" }).click();
      await expect(page.getByRole("alert").first()).toBeVisible();
    });

    test("email input has aria-invalid and aria-describedby on empty submit", async ({ page }) => {
      // Clear the email field and submit to trigger zod validation (not browser native)
      await page.getByLabel("Email Address").fill("");
      await page.getByRole("button", { name: "Send Reset Link" }).click();
      const emailInput = page.getByLabel("Email Address");
      await expect(emailInput).toHaveAttribute("aria-invalid", "true", { timeout: 5000 });
      await expect(emailInput).toHaveAttribute("aria-describedby", "email-error");
    });

    test("back to sign in link works", async ({ page }) => {
      await page.getByRole("link", { name: "Back to Sign In" }).click();
      await expect(page).toHaveURL(/signin/);
    });
  });

  test.describe("Verify Email Page", () => {
    test("renders verification pending state", async ({ page }) => {
      await page.goto("/verify-email?email=test@example.com");
      await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
      await expect(page.getByText("test@example.com")).toBeVisible();
    });

    test("shows info and warning messages", async ({ page }) => {
      await page.goto("/verify-email?email=test@example.com");
      await expect(page.getByRole("status")).toBeVisible();
      await expect(page.getByText("expire in 24 hours")).toBeVisible();
    });

    test("resend button is visible for email users", async ({ page }) => {
      await page.goto("/verify-email?email=test@example.com");
      await expect(page.getByRole("button", { name: /Resend/i })).toBeVisible();
    });
  });
});

test.describe("Auth Layout", () => {
  test("has skip to content link", async ({ page }) => {
    await page.goto("/signin");
    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await expect(skipLink).toBeAttached();
  });

  test("has main content landmark", async ({ page }) => {
    await page.goto("/signin");
    await expect(page.locator("main#main-content")).toBeVisible();
  });

  test("has footer with copyright", async ({ page }) => {
    await page.goto("/signin");
    await expect(page.getByText(/Vaivamm Capital. All rights reserved/)).toBeVisible();
  });
});
