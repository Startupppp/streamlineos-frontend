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

  test.describe("templates — keyboard tab order at 1280 px", () => {
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
      "all three template cards have the listitem role",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="templates-grid-keyboard"]');
        await expect(scope.locator('[role="listitem"]')).toHaveCount(3);
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

    test(
      "Tab visits Use Template then Delete in card-reading order across all three cards",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="templates-grid-keyboard"]');
        const cards = scope.locator('[role="listitem"]');

        const useBtn0 = cards.nth(0).getByRole("button", { name: "Use Template", exact: true });
        const delBtn0 = cards.nth(0).getByRole("button", { name: "Delete Sprint Planning template", exact: true });
        const useBtn1 = cards.nth(1).getByRole("button", { name: "Use Template", exact: true });
        const delBtn1 = cards.nth(1).getByRole("button", { name: "Delete Bug Bash template", exact: true });
        const useBtn2 = cards.nth(2).getByRole("button", { name: "Use Template", exact: true });
        const delBtn2 = cards.nth(2).getByRole("button", { name: "Delete Feature Launch template", exact: true });

        await useBtn0.focus();
        await expect(useBtn0).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(delBtn0).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(useBtn1).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(delBtn1).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(useBtn2).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(delBtn2).toBeFocused();
      },
    );
  });

  test.describe("all-work — view-switcher is keyboard-focusable at 1280 px", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(page.getByRole("heading", { name: "Org-work surfaces", exact: true })).toBeVisible();
    });

    test(
      "view-switcher Select trigger is keyboard-focusable",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="all-work-keyboard"]');
        const trigger = scope.getByRole("combobox", { name: "Select view", exact: true });
        await trigger.focus();
        await expect(trigger).toBeFocused();
      },
    );

    test(
      "Esc closes the view-switcher overlay and returns focus to the trigger",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="all-work-keyboard"]');
        const trigger = scope.getByRole("combobox", { name: "Select view", exact: true });
        await trigger.focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("listbox")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("listbox")).not.toBeVisible();
        await expect(trigger).toBeFocused();
      },
    );
  });

  test.describe("approvals — keyboard tab order at 1280 px", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(page.getByRole("heading", { name: "Org-work surfaces", exact: true })).toBeVisible();
    });

    test(
      "approval list has listitem role for each row",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="approvals-keyboard"]');
        await expect(scope.locator('[role="listitem"]')).toHaveCount(3);
      },
    );

    test(
      "Tab visits each Decide button in row order",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="approvals-keyboard"]');
        const decides = scope.getByRole("button", { name: "Decide", exact: true });
        await expect(decides).toHaveCount(3);

        await decides.nth(0).focus();
        await expect(decides.nth(0)).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(decides.nth(1)).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(decides.nth(2)).toBeFocused();
      },
    );
  });

  test.describe("command-center — keyboard tab order at 1280 px", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(page.getByRole("heading", { name: "Org-work surfaces", exact: true })).toBeVisible();
    });

    test(
      "Tab visits each work-item link in row order",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="command-center-keyboard"]');
        const links = scope.getByRole("link");
        await expect(links).toHaveCount(3);

        await links.nth(0).focus();
        await expect(links.nth(0)).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(links.nth(1)).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(links.nth(2)).toBeFocused();
      },
    );
  });

  test.describe("inbox — keyboard tab order at 1280 px", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(page.getByRole("heading", { name: "Org-work surfaces", exact: true })).toBeVisible();
    });

    test(
      "Tab visits each notification button in row order",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="inbox-keyboard"]');
        const buttons = scope.locator('button[aria-pressed]');
        await expect(buttons).toHaveCount(3);

        await buttons.nth(0).focus();
        await expect(buttons.nth(0)).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(buttons.nth(1)).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(buttons.nth(2)).toBeFocused();
      },
    );
  });

  test.describe("my-work — keyboard tab order at 1280 px", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(page.getByRole("heading", { name: "Org-work surfaces", exact: true })).toBeVisible();
    });

    test(
      "Tab visits each work-item link in row order",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="my-work-keyboard"]');
        const links = scope.getByRole("link");
        await expect(links).toHaveCount(3);

        await links.nth(0).focus();
        await expect(links.nth(0)).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(links.nth(1)).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(links.nth(2)).toBeFocused();
      },
    );
  });

  test.describe("org-projects — keyboard tab order at 1280 px", () => {
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
        await expect(cards).toHaveCount(3);
        for (let i = 0; i < 3; i += 1) {
          const name = await cards.nth(i).getAttribute("aria-label");
          expect(name).toBeTruthy();
        }
      },
    );

    test(
      "Tab visits each project card in grid order",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="org-projects-keyboard"]');
        const cards = scope.locator('[role="listitem"]');

        await cards.nth(0).focus();
        await expect(cards.nth(0)).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(cards.nth(1)).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(cards.nth(2)).toBeFocused();
      },
    );
  });

  test.describe("teams — keyboard tab order and Esc at 1280 px", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(page.getByRole("heading", { name: "Org-work surfaces", exact: true })).toBeVisible();
    });

    test(
      "each team row has role=listitem",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="teams-keyboard"]');
        await expect(scope.locator('[role="listitem"]')).toHaveCount(3);
      },
    );

    test(
      "Tab visits each team row actions button in row order — two per row, six total",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="teams-keyboard"]');
        const buttons = scope.locator('button[aria-label*="Actions for"]');
        await expect(buttons).toHaveCount(6);

        await buttons.nth(0).focus();
        await expect(buttons.nth(0)).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(buttons.nth(1)).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(buttons.nth(2)).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(buttons.nth(3)).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(buttons.nth(4)).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(buttons.nth(5)).toBeFocused();
      },
    );

    test(
      "Esc closes the team actions dropdown and returns focus to its trigger",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="teams-keyboard"]');
        const trigger = scope.locator('button[aria-label="Actions for Engineering"]').nth(0);
        await trigger.focus();
        await expect(trigger).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("menuitem", { name: "Edit", exact: true })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("menuitem", { name: "Edit", exact: true })).not.toBeVisible();
        await expect(trigger).toBeFocused();
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
