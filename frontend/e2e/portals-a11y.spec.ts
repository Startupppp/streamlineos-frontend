import { expect, test, type Locator, type Page } from "@playwright/test";

const GALLERY = "/design-system/portals";
const EVIDENCE_DIR = "test-results/portals-evidence";

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
] as const;

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
  });

  test.describe("reduced motion", () => {
    test.use({ contextOptions: { reducedMotion: "reduce" } });

    test.beforeEach(async ({ page }) => {
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Portal surfaces" }),
      ).toBeVisible();
    });

    test("no animated spinner is visible at rest under reduced motion", async ({ page }) => {
      const spinners = page.locator(".animate-spin");
      const count = await spinners.count();
      for (let i = 0; i < count; i += 1) {
        const visible = await spinners.nth(i).isVisible();
        expect(visible).toBe(false);
      }
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
  });
});
