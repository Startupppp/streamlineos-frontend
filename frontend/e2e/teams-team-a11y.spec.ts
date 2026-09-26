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
      "Tab order follows visual row order — role select then remove button for each of the three rows",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="team-members-keyboard"]');
        const rows = scope.locator('[role="listitem"]');

        const aliceSelect = rows
          .nth(0)
          .getByRole("combobox", { name: "Role for Alice Chen", exact: true });
        await aliceSelect.focus();
        await expect(aliceSelect).toBeFocused();

        await page.keyboard.press("Tab");
        await expect(
          rows.nth(0).getByRole("button", { name: "Remove Alice Chen", exact: true }),
        ).toBeFocused();

        await page.keyboard.press("Tab");
        await expect(
          rows.nth(1).getByRole("combobox", { name: "Role for Bob Smith", exact: true }),
        ).toBeFocused();

        await page.keyboard.press("Tab");
        await expect(
          rows.nth(1).getByRole("button", { name: "Remove Bob Smith", exact: true }),
        ).toBeFocused();

        await page.keyboard.press("Tab");
        await expect(
          rows.nth(2).getByRole("combobox", { name: "Role for Carol Davis", exact: true }),
        ).toBeFocused();

        await page.keyboard.press("Tab");
        await expect(
          rows.nth(2).getByRole("button", { name: "Remove Carol Davis", exact: true }),
        ).toBeFocused();
      },
    );

    test(
      "each row control names the person it acts on, so three identically-worded controls are distinguishable by screen reader",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="team-members-keyboard"]');

        for (const person of ["Alice Chen", "Bob Smith", "Carol Davis"]) {
          await expect(
            scope.getByRole("combobox", { name: `Role for ${person}`, exact: true }),
          ).toHaveCount(1);
          await expect(
            scope.getByRole("button", { name: `Remove ${person}`, exact: true }),
          ).toHaveCount(1);
        }

        await expect(scope.getByRole("button", { name: "Remove member", exact: true })).toHaveCount(
          0,
        );
      },
    );

    test(
      "the role combobox is named for its purpose rather than its current value, so its name does not change when the role changes",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="team-members-keyboard"]');

        await expect(scope.getByRole("combobox", { name: "Lead", exact: true })).toHaveCount(0);
        await expect(scope.getByRole("combobox", { name: "Member", exact: true })).toHaveCount(0);
        await expect(
          scope.getByRole("combobox", { name: "Role for Alice Chen", exact: true }),
        ).toHaveCount(1);
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
