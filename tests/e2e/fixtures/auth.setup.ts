import { test as setup, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const STORAGE_STATE = path.join(__dirname, ".auth", "user.json");

setup.use({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
});

setup("authenticate", async ({ page, baseURL }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing E2E_USER_EMAIL or E2E_USER_PASSWORD env vars.\n" +
        "  E2E_USER_EMAIL=ceo@vaivamm.com E2E_USER_PASSWORD=... pnpm test:loading",
    );
  }

  await page.goto("/signin", { waitUntil: "networkidle" });

  // Wait for React hydration.
  const submitButton = page.getByRole("button", { name: /sign in/i }).first();
  await submitButton.waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const btn = document.querySelector("form button[type=submit]");
    return btn !== null && !(btn as HTMLButtonElement).disabled;
  });

  await page.locator("#email").first().fill(email);
  await page.locator("#password").first().fill(password);

  // Before clicking: override window.location.href so the JS-driven redirect
  // after signIn() doesn't navigate to the wrong port (NEXTAUTH_URL mismatch).
  // We only need the session cookie — we'll navigate ourselves.
  await page.evaluate(() => {
    Object.defineProperty(window, "__origLocation", {
      value: window.location,
      writable: false,
    });
    // Block JS-driven navigation by replacing location.href setter.
    const noop = { set: () => {} };
    try {
      Object.defineProperty(window, "location", {
        get() { return (window as unknown as Record<string, unknown>).__origLocation; },
        ...noop,
        configurable: true,
      });
    } catch {
      // Some browsers don't allow this — that's fine, we'll handle the race.
    }
  });

  // Click and wait for the auth cookie to be set.
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/api/auth/callback/credentials") &&
        r.status() === 200,
      { timeout: 15_000 },
    ),
    submitButton.click(),
  ]);

  // Give a beat for cookies to propagate.
  await page.waitForTimeout(500);

  // Now navigate to /dashboard on our own baseURL.
  await page.goto("/dashboard", { waitUntil: "load", timeout: 30_000 });

  await expect(page).not.toHaveURL(/\/signin|\/login/);

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE });
});
