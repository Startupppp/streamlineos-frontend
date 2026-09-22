import { expect, test } from "@playwright/test";
import { HRMS_STATIC_ROUTES } from "@/lib/hrms-static-routes";
import {
  declaredPageTitle,
  declaredRedirect,
} from "@/test-utils/hrms-route-files";
import { signIn } from "./fixtures/session";
import { hasTenantEnv, tenantEnv, tenantSkipReason } from "./fixtures/tenant";

const WALL_PATHS = ["/signin", "/org-setup", "/employee-onboarding", "/access-denied"];
const CONSOLE_FAILURE = /Minified React error|Error:/;
const LOADING_ANNOUNCEMENT = "Loading results…";
const SETTLE_TIMEOUT_MS = 30_000;
const HEADING_TIMEOUT_MS = 20_000;

function isOnPath(expectedPath: string): (url: URL) => boolean {
  return (url) => url.pathname === expectedPath;
}

test.describe("HRMS static routes render for a signed-in owner", () => {
  test.skip(!hasTenantEnv(), tenantSkipReason("hr"));

  test.beforeEach(async ({ context, baseURL }) => {
    if (!baseURL) throw new Error("playwright.config.ts must set use.baseURL");
    await signIn(context, tenantEnv().user, baseURL);
  });

  for (const route of HRMS_STATIC_ROUTES) {
    test(route, async ({ page }, testInfo) => {
      const consoleFailures: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error" && CONSOLE_FAILURE.test(message.text()))
          consoleFailures.push(message.text());
      });
      page.on("pageerror", (error) => {
        consoleFailures.push(`Error: ${error.message}`);
      });

      await page.goto(route);

      const redirectsTo = declaredRedirect(route);
      const expectedPath = redirectsTo ?? route;
      await expect(page, `${route} must land on ${expectedPath}`).toHaveURL(
        isOnPath(expectedPath),
      );
      const landed = new URL(page.url()).pathname;
      expect(
        WALL_PATHS.some((wall) => landed === wall || landed.startsWith(`${wall}/`)),
        `${route} landed on a wall page: ${landed}`,
      ).toBe(false);

      const heading = page.locator("main h1").first();
      await expect(heading, `${route} has no h1 inside main`).toBeVisible({
        timeout: HEADING_TIMEOUT_MS,
      });

      await expect(
        page.getByText(LOADING_ANNOUNCEMENT),
        `${route} still announces "${LOADING_ANNOUNCEMENT}" after ${SETTLE_TIMEOUT_MS}ms`,
      ).toHaveCount(0, { timeout: SETTLE_TIMEOUT_MS });
      await expect(
        page.locator('main [aria-busy="true"]'),
        `${route} still has aria-busy content inside main after ${SETTLE_TIMEOUT_MS}ms`,
      ).toHaveCount(0, { timeout: SETTLE_TIMEOUT_MS });

      await expect(page, `${route} left ${expectedPath} after settling`).toHaveURL(
        isOnPath(expectedPath),
      );

      const observedTitle = (await heading.textContent())?.trim() ?? "";
      testInfo.annotations.push({ type: "observed-title", description: observedTitle });
      expect(observedTitle, `${route} renders an empty h1`).not.toBe("");

      const declaredTitle = redirectsTo === null ? declaredPageTitle(route) : null;
      if (declaredTitle !== null)
        expect(observedTitle, `${route} h1 differs from its declared PageWrapper title`).toBe(
          declaredTitle,
        );

      expect(consoleFailures, `${route} logged console errors`).toEqual([]);
    });
  }
});
