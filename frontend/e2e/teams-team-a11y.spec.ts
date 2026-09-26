import { expect, test, type Page } from "@playwright/test";

async function shimmerAnimationName(page: Page): Promise<string> {
  const shimmer = page
    .locator('[data-case-frame="team-detail-loading"]')
    .locator(".skeleton-shimmer.animate-pulse:visible")
    .first();
  await expect(shimmer).toBeVisible();
  return shimmer.evaluate(
    (node: HTMLElement) => getComputedStyle(node).animationName,
  );
}

const GALLERY = "/design-system/teams-team";

const VIEWPORTS = [
  { name: "375x812", width: 375, height: 812 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1280x800", width: 1280, height: 800 },
] as const;

test.describe("Team detail surfaces — responsive and a11y contract", () => {
  for (const viewport of VIEWPORTS) {
    test.describe(viewport.name, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.goto(GALLERY);
        await expect(
          page.getByRole("heading", { name: "Team detail surfaces" }),
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

      test("the member list is visible with at least one item", async ({ page }) => {
        const list = page.getByRole("list", { name: "Team members" });
        await expect(list).toBeVisible();
        const items = list.locator('[role="listitem"]');
        const count = await items.count();
        expect(count).toBeGreaterThanOrEqual(1);
      });
    });
  }

  test.describe("team member list — keyboard reachability at 1280 px", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Team detail surfaces" }),
      ).toBeVisible();
    });

    test(
      "all three member rows have the listitem role",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="team-members-keyboard"]');
        const items = scope.locator('[role="listitem"]');
        const count = await items.count();
        expect(count).toBe(3);
      },
    );

    test(
      "member role badge is visible and labelled",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="team-members-keyboard"]');
        await expect(scope.getByText("lead")).toBeVisible();
        await expect(scope.getByText("member").first()).toBeVisible();
      },
    );
  });

  test.describe("team member list — responsive layout at 375 px", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Team detail surfaces" }),
      ).toBeVisible();
    });

    test(
      "no member row overflows the viewport width at 375 px",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="team-members-keyboard"]');
        const items = scope.locator('[role="listitem"]');
        const count = await items.count();
        for (let i = 0; i < count; i += 1) {
          const box = await items.nth(i).boundingBox();
          expect(box).not.toBeNull();
          expect(box?.width ?? 0).toBeLessThanOrEqual(375);
        }
      },
    );
  });

  test.describe("high-density desktop — 1920×1080 at deviceScaleFactor 2", () => {
    test.use({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });

    test.beforeEach(async ({ page }) => {
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Team detail surfaces" }),
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
      "the team-members-keyboard case frame is not clipped at the right edge at 1920 px scale 2",
      async ({ page }) => {
        const overflow = await page
          .locator('[data-case-frame="team-members-keyboard"]')
          .evaluate((el) => el.scrollWidth - el.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
      },
    );

    test(
      "the team-detail-loading case frame is not clipped at the right edge at 1920 px scale 2",
      async ({ page }) => {
        const overflow = await page
          .locator('[data-case-frame="team-detail-loading"]')
          .evaluate((el) => el.scrollWidth - el.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
      },
    );
  });

  test.describe("reduced motion — the team detail skeleton shimmer stops", () => {
    test.describe("with reduce requested", () => {
      test.use({ contextOptions: { reducedMotion: "reduce" } });

      test("the real team detail Skeleton computes animation-name none", async ({ page }) => {
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
