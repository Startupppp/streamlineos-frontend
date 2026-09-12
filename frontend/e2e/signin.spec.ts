import { expect, test } from "@playwright/test";

/**
 * The first end-to-end tests, and deliberately the unauthenticated ones.
 *
 * Everything here runs against a real Next server with no session, no backend
 * fixture and no seeded database, which is what makes it a sensible smoke
 * suite: it fails when the app does not boot, when routing breaks, or when the
 * middleware stops guarding private routes — and for no other reason.
 *
 * Reaching an authenticated page is a separate problem and not solved by
 * typing into this form. The session cookie is a NextAuth JWE; it has to be
 * minted with `@auth/core`'s own `encode` and injected into the browser
 * context, which belongs in a fixture rather than in a test that logs in
 * through the UI on every run.
 */
test.describe("signin", () => {
  test("serves the sign-in page with a usable form", async ({ page }) => {
    const response = await page.goto("/signin");

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/sign in/i);

    // The form, not just the page: a route that renders a shell with no inputs
    // is a broken sign-in page that still answers 200.
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();

    // Exact, because the page also offers "Continue with Google" and a loose
    // /continue/i matches both — a strict-mode violation that reads as a
    // missing button rather than as an ambiguous selector.
    await expect(
      page.getByRole("button", { name: "Continue", exact: true }),
    ).toBeVisible();
  });

  test("sends an unauthenticated visitor from a private route to sign-in, and remembers where they were going", async ({
    page,
  }) => {
    await page.goto("/crm");

    await expect(page).toHaveURL(/\/signin\?/);

    // `callbackUrl` is the half worth asserting. A redirect that drops it still
    // lands the user on a sign-in page, and then strands them on the dashboard
    // instead of the page they asked for — which reads as "the link is broken"
    // rather than as a bug in the guard.
    const callbackUrl = new URL(page.url()).searchParams.get("callbackUrl");
    expect(callbackUrl).toBe("/crm");
  });

  test("does not leak a private page's content while redirecting", async ({ page }) => {
    // A client-side-only guard renders the page first and redirects after, so
    // the tenant's data is briefly on screen and fully in the HTML. This asserts
    // the guard is upstream of the render.
    const response = await page.goto("/settings");

    expect(response?.url()).toContain("/signin");
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  });
});
