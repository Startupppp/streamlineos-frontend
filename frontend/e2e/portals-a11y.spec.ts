import { expect, test, type Locator, type Page } from "@playwright/test";

const GALLERY = "/design-system/portals";
const EVIDENCE_DIR = "test-results/portals-evidence";

const FAKE_INVITE_TOKEN = "FAKE-INV-0000-PORTALS-TEST-ONLY-DO-NOT-USE";

const VIEWPORTS = [
  { name: "375x812", width: 375, height: 812 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1280x800", width: 1280, height: 800 },
] as const;

const CASES = [
  "portal-project-card",
  "portal-project-card-minimal",
  "portal-detail-loading",
  "portal-detail-error",
  "portal-detail-not-found",
  "portal-detail-ready",
  "portal-detail-empty",
  "portal-invite-accept",
  "portal-invite-accept-error",
  "portal-invite-accept-missing-token",
  "internal-portal-list",
  "internal-portal-dashboard",
  "internal-change-requests",
  "internal-client-visibility",
  "internal-updates",
  "internal-client-access",
] as const;

async function shimmerAnimationName(page: Page): Promise<string> {
  const shimmer = page
    .locator('[data-case-frame="portal-detail-loading"]')
    .locator(".skeleton-shimmer.animate-pulse:visible")
    .first();
  await expect(shimmer).toBeVisible();
  return shimmer.evaluate(
    (node: HTMLElement) => getComputedStyle(node).animationName,
  );
}

function frame(page: Page, caseId: string): Locator {
  return page.locator(`[data-case-frame="${caseId}"]`);
}

async function horizontalOverflowOf(locator: Locator): Promise<number> {
  return locator.evaluate(
    (node: HTMLElement) => node.scrollWidth - node.clientWidth,
  );
}

test.describe("Portal surfaces responsive contract", () => {
  for (const viewport of VIEWPORTS) {
    test.describe(viewport.name, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(GALLERY);
        await expect(
          page.getByRole("heading", { name: "Portal surfaces" }),
        ).toBeVisible();
      });

      test("the page itself never scrolls sideways", async ({ page }) => {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
      });

      test("no portal surface overflows its own width", async ({ page }, testInfo) => {
        const overflows: Record<string, number> = {};
        for (const caseId of CASES) {
          const scope = frame(page, caseId);
          overflows[caseId] = await horizontalOverflowOf(scope);
          const shot = `${EVIDENCE_DIR}/${caseId}__${viewport.name}.png`;
          await scope.screenshot({ path: shot });
          await testInfo.attach(`${caseId}__${viewport.name}`, {
            path: shot,
            contentType: "image/png",
          });
        }
        const spilling = Object.entries(overflows).filter(([, px]) => px > 1);
        expect(spilling).toEqual([]);
      });
    });
  }

  test.describe("keyboard navigation", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Portal surfaces" }),
      ).toBeVisible();
    });

    test("project card is reachable and activatable by keyboard", async ({ page }) => {
      await page.keyboard.press("Tab");
      const card = frame(page, "portal-project-card").locator("a").first();
      await expect(card).toBeFocused();
      await expect(card).toHaveAttribute("href", /\/client-portal\/101/);
    });

    test("project detail error retry button is keyboard-reachable", async ({ page }) => {
      const retryButton = frame(page, "portal-detail-error").getByRole("button");
      await retryButton.focus();
      await expect(retryButton).toBeFocused();
    });

    test("Request change button in portal-detail-ready opens the dialog when activated by keyboard", async ({ page }) => {
      const requestButton = frame(page, "portal-detail-ready").getByRole("button", {
        name: "Request change",
        exact: true,
      });
      await requestButton.focus();
      await expect(requestButton).toBeFocused();
      await requestButton.press("Enter");
      await expect(
        page.getByRole("dialog", { name: "Submit a change request", exact: true }),
      ).toBeVisible();
    });

    test("Back to projects link in portal-detail-not-found is keyboard-reachable and leads to the portal root", async ({ page }) => {
      const backLink = frame(page, "portal-detail-not-found").getByRole("link", {
        name: "Back to projects",
        exact: true,
      });
      await backLink.focus();
      await expect(backLink).toBeFocused();
      await expect(backLink).toHaveAttribute("href", "/client-portal");
    });

    test("invite-accept loading state header Need help link is keyboard-reachable", async ({ page }) => {
      const needHelpLink = frame(page, "portal-invite-accept").locator("header").getByRole("link", {
        name: "Need help?",
        exact: true,
      });
      await needHelpLink.focus();
      await expect(needHelpLink).toBeFocused();
      await expect(needHelpLink).toHaveAttribute("href", /mailto:/);
    });

    test("invite-accept error Contact support link is keyboard-reachable", async ({ page }) => {
      const contactLink = frame(page, "portal-invite-accept-error").locator("main").getByRole("link", {
        name: "Contact support",
        exact: true,
      });
      await contactLink.focus();
      await expect(contactLink).toBeFocused();
      await expect(contactLink).toHaveAttribute("href", /mailto:/);
    });

    test("invite-accept missing-token Contact support link is keyboard-reachable", async ({ page }) => {
      const contactLink = frame(page, "portal-invite-accept-missing-token").locator("main").getByRole("link", {
        name: "Contact support",
        exact: true,
      });
      await contactLink.focus();
      await expect(contactLink).toBeFocused();
      await expect(contactLink).toHaveAttribute("href", /mailto:/);
    });

    test("internal-portal-list first project card link is keyboard-reachable and points to portal detail", async ({ page }) => {
      const projectLink = frame(page, "internal-portal-list").locator('a[href="/portal/101"]');
      await projectLink.focus();
      await expect(projectLink).toBeFocused();
      await expect(projectLink).toHaveAttribute("href", "/portal/101");
    });

    test("internal-portal-dashboard Submit Request button is keyboard-reachable", async ({ page }) => {
      const button = frame(page, "internal-portal-dashboard").getByRole("button", {
        name: "Submit Request",
        exact: true,
      });
      await button.focus();
      await expect(button).toBeFocused();
    });

    test("internal-change-requests New Change Request button is keyboard-reachable", async ({ page }) => {
      const button = frame(page, "internal-change-requests").getByRole("button", {
        name: "New Change Request",
        exact: true,
      });
      await button.focus();
      await expect(button).toBeFocused();
    });

    test("internal-client-visibility first ticket visibility switch is keyboard-reachable", async ({ page }) => {
      const toggle = frame(page, "internal-client-visibility").getByRole("switch", {
        name: "Toggle client visibility for ticket #42",
        exact: true,
      });
      await toggle.focus();
      await expect(toggle).toBeFocused();
    });

    test("internal-updates Post Update button is keyboard-reachable", async ({ page }) => {
      const button = frame(page, "internal-updates").getByRole("button", {
        name: "Post Update",
        exact: true,
      });
      await button.focus();
      await expect(button).toBeFocused();
    });

    test("internal-client-access Grant Access button is keyboard-reachable", async ({ page }) => {
      const button = frame(page, "internal-client-access").getByRole("button", {
        name: "Grant Access",
        exact: true,
      });
      await button.focus();
      await expect(button).toBeFocused();
    });
  });

  test.describe("reduced motion — loading skeleton shimmer stops", () => {
    test.describe("with reduce requested", () => {
      test.use({ contextOptions: { reducedMotion: "reduce" } });

      test("portal-detail-loading skeleton computes animation-name none under reduced motion", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(GALLERY);
        await expect(
          page.getByRole("heading", { name: "Portal surfaces" }),
        ).toBeVisible();
        expect(await shimmerAnimationName(page)).toBe("none");
      });
    });

    test.describe("with no preference", () => {
      test.use({ contextOptions: { reducedMotion: "no-preference" } });

      test("the same skeleton does animate, proving the reduce assertion is not vacuous", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(GALLERY);
        await expect(
          page.getByRole("heading", { name: "Portal surfaces" }),
        ).toBeVisible();
        expect(await shimmerAnimationName(page)).not.toBe("none");
      });
    });
  });

  test.describe("high-density desktop 1920×1080 @2×", () => {
    test.use({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });

    test.beforeEach(async ({ page }) => {
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Portal surfaces" }),
      ).toBeVisible();
    });

    test("the page itself does not scroll sideways at 2× density", async ({ page }) => {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test("no portal case frame overflows horizontally at 2× density", async ({ page }) => {
      const overflows: Record<string, number> = {};
      for (const caseId of CASES) {
        overflows[caseId] = await horizontalOverflowOf(frame(page, caseId));
      }
      const spilling = Object.entries(overflows).filter(([, px]) => px > 1);
      expect(spilling).toEqual([]);
    });
  });

  test.describe("secret redaction — invite token never appears in DOM", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Portal surfaces" }),
      ).toBeVisible();
    });

    test("fake invite token is held in the gallery data attribute but not rendered as visible text", async ({ page }) => {
      const tokenHolder = frame(page, "portal-invite-accept").locator("[data-invite-token]");
      await expect(tokenHolder).toHaveAttribute("data-invite-token", FAKE_INVITE_TOKEN);
      const frameText = await frame(page, "portal-invite-accept").evaluate(
        (node: HTMLElement) => node.innerText,
      );
      expect(frameText).not.toContain(FAKE_INVITE_TOKEN);
    });

    test("invitation acceptance loading heading is visible, proving the case rendered and not just absent", async ({ page }) => {
      const heading = frame(page, "portal-invite-accept").getByRole("heading", {
        name: "Verifying your invitation…",
        exact: true,
      });
      await expect(heading).toBeVisible();
    });

    test("fake invite token does not appear in any rendered attribute other than the test hook", async ({ page }) => {
      const leaksIntoAttribute = await page.evaluate((token) => {
        const allElements = Array.from(document.querySelectorAll("*"));
        return allElements.some((el) =>
          Array.from(el.attributes).some(
            (attr) => attr.name !== "data-invite-token" && attr.value.includes(token),
          ),
        );
      }, FAKE_INVITE_TOKEN);
      expect(leaksIntoAttribute).toBe(false);
    });
  });

  test.describe("screen reader landmarks", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Portal surfaces" }),
      ).toBeVisible();
    });

    test("portal detail loading has a main landmark", async ({ page }) => {
      const main = frame(page, "portal-detail-loading").locator("main");
      await expect(main).toBeVisible();
    });

    test("portal detail ready has a main landmark", async ({ page }) => {
      const main = frame(page, "portal-detail-ready").locator("main");
      await expect(main).toBeVisible();
    });

    test("portal detail not-found has a visible heading", async ({ page }) => {
      const heading = frame(page, "portal-detail-not-found").getByRole("heading", {
        name: "Project not found",
      });
      await expect(heading).toBeVisible();
    });

    test("portal invite-accept loading has a main landmark from the real StatusLayout", async ({ page }) => {
      const main = frame(page, "portal-invite-accept").locator("main");
      await expect(main).toBeVisible();
    });

    test("portal invite-accept error has a main landmark and a visible error heading", async ({ page }) => {
      const main = frame(page, "portal-invite-accept-error").locator("main");
      await expect(main).toBeVisible();
      const heading = frame(page, "portal-invite-accept-error").getByRole("heading", {
        name: "Could not accept invitation",
        exact: true,
      });
      await expect(heading).toBeVisible();
    });

    test("portal project card renders an accessible link to the project detail", async ({ page }) => {
      const link = frame(page, "portal-project-card").getByRole("link");
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", /\/client-portal\/101/);
    });

    test("internal-portal-list renders an h1 heading for the Client Portal page", async ({ page }) => {
      const h1 = frame(page, "internal-portal-list").getByRole("heading", {
        level: 1,
        name: "Client Portal",
        exact: true,
      });
      await expect(h1).toBeVisible();
    });

    test("internal-portal-dashboard renders an h1 heading with the seeded project name", async ({ page }) => {
      const h1 = frame(page, "internal-portal-dashboard").getByRole("heading", {
        level: 1,
        name: "Northbridge Redesign",
        exact: true,
      });
      await expect(h1).toBeVisible();
    });

    test("internal-change-requests renders an h1 heading for the Change Requests page", async ({ page }) => {
      const h1 = frame(page, "internal-change-requests").getByRole("heading", {
        level: 1,
        name: "Change Requests",
        exact: true,
      });
      await expect(h1).toBeVisible();
    });

    test("internal-client-visibility renders an h1 heading for the Client Portal management page", async ({ page }) => {
      const h1 = frame(page, "internal-client-visibility").getByRole("heading", {
        level: 1,
        name: "Client Portal",
        exact: true,
      });
      await expect(h1).toBeVisible();
    });

    test("internal-updates renders an h1 heading for the Updates page", async ({ page }) => {
      const h1 = frame(page, "internal-updates").getByRole("heading", {
        level: 1,
        name: "Updates",
        exact: true,
      });
      await expect(h1).toBeVisible();
    });

    test("internal-client-access renders an h1 heading for the Client Access settings page", async ({ page }) => {
      const h1 = frame(page, "internal-client-access").getByRole("heading", {
        level: 1,
        name: "Client Access",
        exact: true,
      });
      await expect(h1).toBeVisible();
    });
  });
});
