import { expect, test } from "@playwright/test";
import { signIn } from "./fixtures/session";
import { SKIP_REASON, hasTenantEnv, tenantEnv } from "./fixtures/tenant";

/**
 * Proves the session fixture, and nothing else.
 *
 * Everything that follows it — the operator flows, the RF screens — is built on
 * the assumption that a minted cookie really does produce a signed-in browser.
 * If that assumption is wrong those specs fail on a sign-in page while
 * reporting a missing button, so it is worth one file to establish it
 * separately.
 */
test.describe("authenticated shell", () => {
  test.skip(!hasTenantEnv(), SKIP_REASON);

  test.beforeEach(async ({ context, baseURL }) => {
    await signIn(context, tenantEnv().user, baseURL as string);
  });

  test("a minted session lands on the inventory page instead of sign-in", async ({
    page,
  }) => {
    await page.goto("/inventory/stock");

    // The assertion is about where we did NOT go. The smoke suite already
    // proved this route bounces an anonymous visitor to /signin, so staying on
    // it is the whole proof that the cookie decrypted and the guard accepted
    // the session.
    await expect(page).toHaveURL(/\/inventory\/stock$/);
    await expect(page).not.toHaveURL(/\/signin/);

    // And not the wizard either. An owner whose org has no
    // `onboarding_completed_at` is redirected to /org-setup, which is a
    // perfectly authenticated page — so "not on /signin" alone would call that
    // a pass.
    await expect(page).not.toHaveURL(/\/org-setup|\/employee-onboarding/);
  });

  test("renders the authenticated shell, not a permission or module wall", async ({
    page,
  }) => {
    await page.goto("/inventory/stock");

    await expect(
      page.getByRole("heading", { level: 1 }).first(),
    ).toBeVisible({ timeout: 15_000 });

    // A 402 from `@RequireModule` and a 403 from a missing permission both
    // render as a page, so the URL check above passes and the flow specs then
    // fail hunting for controls that were never going to be there. Naming both
    // walls here turns that into one honest failure.
    await expect(page.getByText(/no permission|access denied/i)).toHaveCount(0);
    await expect(
      page.getByText(/module is not enabled|upgrade your plan/i),
    ).toHaveCount(0);
  });
});
