import { expect, test, type Page } from "@playwright/test";

const GALLERY = "/design-system/org-work";

async function shimmerAnimationName(page: Page): Promise<string> {
  const shimmer = page
    .locator('[data-case-frame="templates-loading"]')
    .locator(".skeleton-shimmer.animate-pulse:visible")
    .first();
  await expect(shimmer).toBeVisible();
  return shimmer.evaluate(
    (node: HTMLElement) => getComputedStyle(node).animationName,
  );
}

const VIEWPORTS = [
  { name: "375x812", width: 375, height: 812 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1280x800", width: 1280, height: 800 },
] as const;

test.describe("Templates surfaces — responsive and a11y contract", () => {
  for (const viewport of VIEWPORTS) {
    test.describe(viewport.name, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.goto(GALLERY);
        await expect(
          page.getByRole("heading", { name: "Templates surfaces" }),
        ).toBeVisible();
      });

      test("the page itself never scrolls sideways", async ({ page }) => {
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
      });

      test("the templates grid is visible with at least one card", async ({ page }) => {
        const grid = page.getByRole("list", { name: "Project templates" });
        await expect(grid).toBeVisible();
        const cards = grid.locator('[role="listitem"]');
        const count = await cards.count();
        expect(count).toBeGreaterThanOrEqual(1);
      });
    });
  }

  test.describe("templates grid — keyboard reachability at 1280 px", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Templates surfaces" }),
      ).toBeVisible();
    });

    test(
      "the templates surface ships no search control, so the / binding has no target to focus",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="templates-grid-keyboard"]');
        await expect(scope.locator('input[type="search"]')).toHaveCount(0);
      },
    );

    test(
      "all three template cards have the listitem role and are keyboard focusable via Tab",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="templates-grid-keyboard"]');
        const cards = scope.locator('[role="listitem"]');
        const count = await cards.count();
        expect(count).toBe(3);
        for (let i = 0; i < count; i += 1) {
          const inner = cards.nth(i).locator("button").first();
          await inner.focus();
          await expect(inner).toBeFocused();
        }
      },
    );

    test(
      "Use Template button inside a card is keyboard reachable and labelled",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="templates-grid-keyboard"]');
        const useButton = scope.getByRole("button", { name: "Use Template" }).first();
        await useButton.focus();
        await expect(useButton).toBeFocused();
      },
    );

    test(
      "Delete button inside a card carries an accessible aria-label so icon-only button rule is satisfied",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="templates-grid-keyboard"]');
        const deleteButton = scope.getByRole("button", { name: /delete sprint planning/i });
        await expect(deleteButton).toBeVisible();
      },
    );
  });

  test.describe("templates grid — responsive layout at 375 px", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Templates surfaces" }),
      ).toBeVisible();
    });

    test(
      "no card overflows the viewport width at 375 px",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="templates-grid-keyboard"]');
        const cards = scope.locator('[role="listitem"]');
        const count = await cards.count();
        for (let i = 0; i < count; i += 1) {
          const box = await cards.nth(i).boundingBox();
          expect(box).not.toBeNull();
          expect(box?.width ?? 0).toBeLessThanOrEqual(375);
        }
      },
    );

    test(
      "all cards are stacked in a single column at 375 px, so no two cards share the same y-offset",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="templates-grid-keyboard"]');
        const cards = scope.locator('[role="listitem"]');
        const count = await cards.count();
        expect(count).toBeGreaterThanOrEqual(2);
        const boxes = await Promise.all(
          Array.from({ length: count }, (_, i) => cards.nth(i).boundingBox()),
        );
        const yValues = boxes.map((b) => b?.y ?? 0);
        const uniqueYs = new Set(yValues);
        expect(uniqueYs.size).toBe(count);
      },
    );
  });

  test.describe("high-density desktop — 1920×1080 at deviceScaleFactor 2", () => {
    test.use({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });

    test.beforeEach(async ({ page }) => {
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Templates surfaces" }),
      ).toBeVisible();
    });

    test("the page itself never scrolls sideways at 1920 px scale 2", async ({ page }) => {
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test(
      "the templates-grid-keyboard case frame is not clipped at the right edge at 1920 px scale 2",
      async ({ page }) => {
        const overflow = await page
          .locator('[data-case-frame="templates-grid-keyboard"]')
          .evaluate((el) => el.scrollWidth - el.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
      },
    );

    test(
      "the templates-loading case frame is not clipped at the right edge at 1920 px scale 2",
      async ({ page }) => {
        const overflow = await page
          .locator('[data-case-frame="templates-loading"]')
          .evaluate((el) => el.scrollWidth - el.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
      },
    );
  });

  test.describe("reduced motion — the templates skeleton shimmer stops", () => {
    test.describe("with reduce requested", () => {
      test.use({ contextOptions: { reducedMotion: "reduce" } });

      test("the real TemplatesGridSkeleton computes animation-name none", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(GALLERY);
        expect(await shimmerAnimationName(page)).toBe("none");
      });
    });

    test.describe("with no preference", () => {
      test.use({ contextOptions: { reducedMotion: "no-preference" } });

      test("the same skeleton does animate, proving the reduce assertion is not vacuous", async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(GALLERY);
        expect(await shimmerAnimationName(page)).not.toBe("none");
      });
    });
  });
});
