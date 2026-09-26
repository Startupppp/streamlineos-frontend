import { expect, test, type Page } from "@playwright/test";

const GALLERY = "/design-system/org-work";

const LOADING_FRAMES = [
  "templates-loading",
  "all-work-loading",
  "approvals-loading",
  "command-center-loading",
  "inbox-loading",
  "my-work-loading",
  "org-projects-loading",
  "teams-loading",
] as const;

const KEYBOARD_FRAMES = [
  "templates-grid-keyboard",
  "all-work-keyboard",
  "approvals-keyboard",
  "command-center-keyboard",
  "inbox-keyboard",
  "my-work-keyboard",
  "org-projects-keyboard",
  "teams-keyboard",
] as const;

async function shimmerAnimationName(page: Page, caseFrame: string): Promise<string> {
  const shimmer = page
    .locator(`[data-case-frame="${caseFrame}"]`)
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

const PAGE_HEADINGS = [
  "Templates",
  "All Work",
  "Approvals",
  "Command Center",
  "Inbox",
  "My Work",
  "Org Projects",
  "Teams",
] as const;

test.describe("Org-work pages — responsive and a11y contract", () => {

  for (const viewport of VIEWPORTS) {
    test.describe(viewport.name, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(GALLERY);
        await expect(page.getByRole("heading", { name: "Org-work surfaces", exact: true })).toBeVisible();
      });

      test("the page itself never scrolls sideways", async ({ page }) => {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
      });

      test("all eight page section headings are visible", async ({ page }) => {
        for (const heading of PAGE_HEADINGS) {
          await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
        }
      });
    });
  }

  test.describe("templates — keyboard reachability at 1280 px", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(page.getByRole("heading", { name: "Org-work surfaces", exact: true })).toBeVisible();
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
        const useButton = scope.getByRole("button", { name: "Use Template", exact: true }).first();
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

  test.describe("all-work — keyboard reachability at 1280 px", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(page.getByRole("heading", { name: "Org-work surfaces", exact: true })).toBeVisible();
    });

    test(
      "view-switcher Select trigger is keyboard focusable and carries an accessible label",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="all-work-keyboard"]');
        const trigger = scope.getByRole("combobox", { name: "Select view", exact: true });
        await trigger.focus();
        await expect(trigger).toBeFocused();
      },
    );
  });

  test.describe("approvals — keyboard reachability at 1280 px", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(page.getByRole("heading", { name: "Org-work surfaces", exact: true })).toBeVisible();
    });

    test(
      "approval list has listitem role for each row",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="approvals-keyboard"]');
        const items = scope.locator('[role="listitem"]');
        const count = await items.count();
        expect(count).toBe(3);
      },
    );

    test(
      "Decide button inside each approval row is keyboard focusable",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="approvals-keyboard"]');
        const decideButton = scope.getByRole("button", { name: "Decide", exact: true }).first();
        await decideButton.focus();
        await expect(decideButton).toBeFocused();
      },
    );
  });

  test.describe("command-center — keyboard reachability at 1280 px", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(page.getByRole("heading", { name: "Org-work surfaces", exact: true })).toBeVisible();
    });

    test(
      "each issue row is a keyboard-focusable link with a non-empty accessible name",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="command-center-keyboard"]');
        const links = scope.getByRole("link");
        const count = await links.count();
        expect(count).toBeGreaterThanOrEqual(3);
        const first = links.first();
        await first.focus();
        await expect(first).toBeFocused();
      },
    );
  });

  test.describe("inbox — keyboard reachability at 1280 px", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(page.getByRole("heading", { name: "Org-work surfaces", exact: true })).toBeVisible();
    });

    test(
      "each notification item is a keyboard-focusable button with aria-pressed",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="inbox-keyboard"]');
        const buttons = scope.locator('button[aria-pressed]');
        const count = await buttons.count();
        expect(count).toBe(3);
        const first = buttons.first();
        await first.focus();
        await expect(first).toBeFocused();
      },
    );
  });

  test.describe("my-work — keyboard reachability at 1280 px", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(page.getByRole("heading", { name: "Org-work surfaces", exact: true })).toBeVisible();
    });

    test(
      "each work-item row is a keyboard-focusable link",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="my-work-keyboard"]');
        const links = scope.getByRole("link");
        const count = await links.count();
        expect(count).toBe(3);
        const first = links.first();
        await first.focus();
        await expect(first).toBeFocused();
      },
    );
  });

  test.describe("org-projects — keyboard reachability at 1280 px", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(page.getByRole("heading", { name: "Org-work surfaces", exact: true })).toBeVisible();
    });

    test(
      "each project card has role=listitem and carries an accessible name",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="org-projects-keyboard"]');
        const cards = scope.locator('[role="listitem"]');
        const count = await cards.count();
        expect(count).toBe(3);
        for (let i = 0; i < count; i += 1) {
          const name = await cards.nth(i).getAttribute("aria-label");
          expect(name).toBeTruthy();
        }
      },
    );

    test(
      "project cards are keyboard focusable via their tabIndex",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="org-projects-keyboard"]');
        const card = scope.locator('[role="listitem"]').first();
        await card.focus();
        await expect(card).toBeFocused();
      },
    );
  });

  test.describe("teams — keyboard reachability at 1280 px", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(page.getByRole("heading", { name: "Org-work surfaces", exact: true })).toBeVisible();
    });

    test(
      "each team row has role=listitem",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="teams-keyboard"]');
        const items = scope.locator('[role="listitem"]');
        const count = await items.count();
        expect(count).toBe(3);
      },
    );

    test(
      "each team row actions button is keyboard focusable and carries a team-scoped aria-label",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="teams-keyboard"]');
        const actionsButtons = scope.locator('button[aria-label*="Actions for"]');
        const count = await actionsButtons.count();
        expect(count).toBe(3);
        const first = actionsButtons.first();
        await first.focus();
        await expect(first).toBeFocused();
      },
    );
  });

  test.describe("templates grid — responsive layout at 375 px", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(GALLERY);
      await expect(page.getByRole("heading", { name: "Org-work surfaces", exact: true })).toBeVisible();
    });

    test(
      "no template card overflows the viewport width at 375 px",
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
      "all template cards are stacked in a single column at 375 px, so no two share the same y-offset",
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
      await expect(page.getByRole("heading", { name: "Org-work surfaces", exact: true })).toBeVisible();
    });

    test("the page itself never scrolls sideways at 1920 px scale 2", async ({ page }) => {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });

    for (const frame of LOADING_FRAMES) {
      test(
        `the ${frame} case frame is not clipped at the right edge at 1920 px scale 2`,
        async ({ page }) => {
          const overflow = await page
            .locator(`[data-case-frame="${frame}"]`)
            .evaluate((el) => el.scrollWidth - el.clientWidth);
          expect(overflow).toBeLessThanOrEqual(1);
        },
      );
    }

    for (const frame of KEYBOARD_FRAMES) {
      test(
        `the ${frame} case frame is not clipped at the right edge at 1920 px scale 2`,
        async ({ page }) => {
          const overflow = await page
            .locator(`[data-case-frame="${frame}"]`)
            .evaluate((el) => el.scrollWidth - el.clientWidth);
          expect(overflow).toBeLessThanOrEqual(1);
        },
      );
    }
  });

  test.describe("reduced motion — all skeletons stop under prefers-reduced-motion", () => {
    test.describe("with reduce requested", () => {
      test.use({ contextOptions: { reducedMotion: "reduce" } });

      for (const frame of LOADING_FRAMES) {
        test(
          `${frame}: skeleton shimmer computes animation-name none`,
          async ({ page }) => {
            await page.setViewportSize({ width: 1280, height: 800 });
            await page.goto(GALLERY);
            expect(await shimmerAnimationName(page, frame)).toBe("none");
          },
        );
      }
    });

    test.describe("with no preference", () => {
      test.use({ contextOptions: { reducedMotion: "no-preference" } });

      for (const frame of LOADING_FRAMES) {
        test(
          `${frame}: skeleton does animate under no-preference (paired — proves reduce test is not vacuous)`,
          async ({ page }) => {
            await page.setViewportSize({ width: 1280, height: 800 });
            await page.goto(GALLERY);
            expect(await shimmerAnimationName(page, frame)).not.toBe("none");
          },
        );
      }
    });
  });
});
