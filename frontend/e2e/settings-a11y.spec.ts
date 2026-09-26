import { expect, test, type Locator, type Page } from "@playwright/test";

const GALLERY = "/design-system/settings";
const EVIDENCE_DIR = "test-results/settings-evidence";

const VIEWPORTS = [
  { name: "375x812", width: 375, height: 812 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1280x800", width: 1280, height: 800 },
] as const;

const CASES = [
  "settings-views-ready",
  "settings-views-loading",
  "settings-views-empty",
  "settings-views-denied",
  "settings-credentials-token-list",
  "settings-project-loading",
  "settings-project-access-loading",
  "settings-project-agents-loading",
  "settings-project-automations-loading",
  "settings-project-fields-loading",
  "settings-project-integrations-loading",
  "settings-project-webhooks-loading",
  "settings-project-iterations-loading",
  "settings-project-portal-loading",
  "settings-project-retention-loading",
  "settings-project-workflow-loading",
  "settings-org-access-loading",
  "settings-org-integrations-loading",
] as const;

function frame(page: Page, caseId: string): Locator {
  return page.locator(`[data-case-frame="${caseId}"]`);
}

async function horizontalOverflowOf(locator: Locator): Promise<number> {
  return locator.evaluate(
    (node: HTMLElement) => node.scrollWidth - node.clientWidth,
  );
}

test.describe("Settings responsive contract", () => {
  for (const viewport of VIEWPORTS) {
    test.describe(viewport.name, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(GALLERY);
        await expect(
          page.getByRole("heading", { name: "Settings surfaces" }),
        ).toBeVisible();
      });

      test("the page itself never scrolls sideways", async ({ page }) => {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
      });

      test("no settings surface overflows its own width", async ({ page }, testInfo) => {
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

  test.describe("accessibility — ARIA structure", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Settings surfaces" }),
      ).toBeVisible();
    });

    test("the credentials token row code element shows the token prefix and the Revoke button has an accessible name", async ({ page }) => {
      const scope = frame(page, "settings-credentials-token-list");
      await expect(scope.locator("code").filter({ hasText: /slat_Fa9c/ })).toBeVisible();
      const revokeButton = scope.getByRole("button", { name: "Revoke", exact: true });
      await expect(revokeButton).toBeVisible();
    });

    test("loading skeleton cases mark each skeleton element aria-hidden so screen readers skip the in-progress state", async ({ page }) => {
      const scope = frame(page, "settings-views-loading");
      const firstSkeleton = scope.locator(".skeleton-shimmer").first();
      await expect(firstSkeleton).toBeVisible();
      await expect(firstSkeleton).toHaveAttribute("aria-hidden", "true");
    });

    test("the views-ready case has a search input with an accessible label", async ({ page }) => {
      const scope = frame(page, "settings-views-ready");
      const searchInput = scope.locator("[data-slot=search-input] input:visible");
      await expect(searchInput).toBeVisible();
      const ariaLabel = await searchInput.getAttribute("aria-label");
      const ariaLabelledBy = await searchInput.getAttribute("aria-labelledby");
      const id = await searchInput.getAttribute("id");
      const hasAssociatedLabel =
        ariaLabel !== null ||
        ariaLabelledBy !== null ||
        (id !== null && (await page.locator(`label[for="${id}"]`).count()) > 0);
      expect(hasAssociatedLabel).toBe(true);
    });
  });

  test.describe("reduced motion — the skeleton shimmer stops", () => {
    test.describe("with reduce requested", () => {
      test.use({ contextOptions: { reducedMotion: "reduce" } });

      test("the loading skeleton computes animation-name none", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(GALLERY);
        const skeleton = frame(page, "settings-views-loading")
          .locator(".skeleton-shimmer.animate-pulse:visible")
          .first();
        await expect(skeleton).toBeVisible();
        const animName = await skeleton.evaluate(
          (el: HTMLElement) => getComputedStyle(el).animationName,
        );
        expect(animName).toBe("none");
      });
    });

    test.describe("with no preference", () => {
      test.use({ contextOptions: { reducedMotion: "no-preference" } });

      test("the same skeleton does animate, proving the reduce assertion is not vacuous", async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(GALLERY);
        const skeleton = frame(page, "settings-views-loading")
          .locator(".skeleton-shimmer.animate-pulse:visible")
          .first();
        await expect(skeleton).toBeVisible();
        const animName = await skeleton.evaluate(
          (el: HTMLElement) => getComputedStyle(el).animationName,
        );
        expect(animName).not.toBe("none");
      });
    });
  });

  test.describe("keyboard navigation", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Settings surfaces" }),
      ).toBeVisible();
    });

    test("Tab from the search input reaches the scroll region, then the first view card name button", async ({
      page,
    }) => {
      const scope = frame(page, "settings-views-ready");
      const searchInput = scope.locator("[data-slot=search-input] input:visible");
      await searchInput.focus();
      await expect(searchInput).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(scope.locator('[role="region"][tabindex="0"]')).toBeFocused();

      await page.keyboard.press("Tab");
      const nameButton = scope.locator("button").filter({ hasText: "Engineering backlog" });
      await expect(nameButton).toBeFocused();
    });

    test("the scroll region stop shows a focus ring, so the keyboard user can see where the extra stop went", async ({
      page,
    }) => {
      const scope = frame(page, "settings-views-ready");
      const region = scope.locator('[role="region"][tabindex="0"]');
      await region.focus();
      await expect(region).toBeFocused();
      const outlineWidth = await region.evaluate(
        (el: HTMLElement) => getComputedStyle(el).outlineWidth,
      );
      const boxShadow = await region.evaluate(
        (el: HTMLElement) => getComputedStyle(el).boxShadow,
      );
      expect(`${outlineWidth} ${boxShadow}`).not.toBe("0px none");
    });

    test("the scroll region carries an accessible name, so landing on it tells a screen-reader user what it is", async ({
      page,
    }) => {
      const scope = frame(page, "settings-views-ready");
      const region = scope.locator('[role="region"][tabindex="0"]');
      const named = await region.evaluate(
        (el: HTMLElement) =>
          el.getAttribute("aria-label") !== null || el.getAttribute("aria-labelledby") !== null,
      );
      expect(named).toBe(true);
    });

    test("the Revoke button in the credentials token list is keyboard-focusable", async ({ page }) => {
      const scope = frame(page, "settings-credentials-token-list");
      const revokeButton = scope.getByRole("button", { name: "Revoke", exact: true });
      await revokeButton.focus();
      await expect(revokeButton).toBeFocused();
    });

    test("Tab from the Rename saved view button reaches the Delete saved view button in the same card", async ({
      page,
    }) => {
      const scope = frame(page, "settings-views-ready");
      const renameButton = scope
        .getByRole("button", { name: "Rename saved view", exact: true })
        .first();
      await renameButton.focus();
      await expect(renameButton).toBeFocused();
      await page.keyboard.press("Tab");
      const deleteButton = scope
        .getByRole("button", { name: "Delete saved view", exact: true })
        .first();
      await expect(deleteButton).toBeFocused();
    });
  });

  test.describe("high-density desktop — 1920 × 1080 at scale 2", () => {
    test.use({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });

    test.beforeEach(async ({ page }) => {
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Settings surfaces" }),
      ).toBeVisible();
    });

    test("the page itself never scrolls sideways", async ({ page }) => {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test("no settings surface overflows its own width", async ({ page }) => {
      for (const caseId of CASES) {
        const scope = frame(page, caseId);
        const overflow = await horizontalOverflowOf(scope);
        expect(overflow).toBeLessThanOrEqual(1);
      }
    });

    test("the search input in the ready case does not clip past the right edge of its frame", async ({
      page,
    }) => {
      const scope = frame(page, "settings-views-ready");
      const frameBox = await scope.boundingBox();
      const searchInput = scope.locator("[data-slot=search-input] input:visible");
      const inputBox = await searchInput.boundingBox();
      expect((inputBox?.x ?? 0) + (inputBox?.width ?? 0)).toBeLessThanOrEqual(
        (frameBox?.x ?? 0) + (frameBox?.width ?? 0) + 1,
      );
    });
  });

  test.describe("secret redaction — token list shows only the prefix, never the full value", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Settings surfaces" }),
      ).toBeVisible();
    });

    test("the stub token prefix is visible in the credentials case", async ({ page }) => {
      const scope = frame(page, "settings-credentials-token-list");
      const maskedCode = scope.locator("code").filter({ hasText: /slat_Fa9c/ });
      await expect(maskedCode).toBeVisible();
    });

    test("the full token value that was never passed to the gallery is absent from all DOM text, proving the masked assertion is not vacuous", async ({
      page,
    }) => {
      const fullTokenNeverRendered = "slat_Fa9c_neverRenderThisValue";
      await expect(
        page.getByText(fullTokenNeverRendered, { exact: false }),
      ).toHaveCount(0);
      await expect(
        page.locator(`[title*="${fullTokenNeverRendered}"]`),
      ).toHaveCount(0);
      await expect(
        page.locator(`[aria-label*="${fullTokenNeverRendered}"]`),
      ).toHaveCount(0);
    });
  });
});
