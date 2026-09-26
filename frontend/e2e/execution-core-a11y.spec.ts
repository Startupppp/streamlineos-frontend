import { expect, test } from "@playwright/test";

const GALLERY = "/design-system/execution-core";

const VIEWPORTS = [
  { name: "375x812", width: 375, height: 812 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1280x800", width: 1280, height: 800 },
] as const;

test.describe("Execution core — responsive and a11y contract", () => {
  for (const viewport of VIEWPORTS) {
    test.describe(viewport.name, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.goto(GALLERY);
        await expect(
          page.getByRole("heading", { name: "Execution core surfaces", exact: true }),
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
    });
  }

  test.describe("high-density desktop — 1920×1080 @ scale 2", () => {
    test.use({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });

    test.beforeEach(async ({ page }) => {
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Execution core surfaces", exact: true }),
      ).toBeVisible();
    });

    test(
      "the page itself never scrolls sideways at scale-2 1920 px",
      async ({ page }) => {
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
      },
    );

    test(
      "each case frame contains its content without horizontal overflow at scale-2 1920 px",
      async ({ page }) => {
        const frames = page.locator("[data-case-frame]");
        const count = await frames.count();
        expect(count).toBeGreaterThan(0);
        for (let i = 0; i < count; i += 1) {
          const frameOverflow = await frames.nth(i).evaluate(
            (el: HTMLElement) => el.scrollWidth - el.clientWidth,
          );
          expect(frameOverflow).toBeLessThanOrEqual(1);
        }
      },
    );

    test(
      "kanban scroll container is the designated overflow boundary and the page does not scroll at scale-2 1920 px",
      async ({ page }) => {
        const container = page.locator('[data-testid="kanban-scroll-container"]');
        await expect(container).toBeVisible();
        const overflowX = await container.evaluate(
          (el: HTMLElement) => getComputedStyle(el).overflowX,
        );
        expect(overflowX).toBe("auto");
        const pageOverflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(pageOverflow).toBeLessThanOrEqual(1);
      },
    );
  });

  test.describe("kanban board — horizontal overflow", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Execution core surfaces", exact: true }),
      ).toBeVisible();
    });

    test(
      "kanban scroll container overflows horizontally at 375 px while page does not",
      async ({ page }) => {
        const container = page.locator('[data-testid="kanban-scroll-container"]');
        await expect(container).toBeVisible();

        const containerOverflow = await container.evaluate(
          (node: HTMLElement) => node.scrollWidth - node.clientWidth,
        );
        expect(containerOverflow).toBeGreaterThan(0);

        const pageOverflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(pageOverflow).toBeLessThanOrEqual(1);
      },
    );

    test(
      "kanban board cards have an interactive title button that is keyboard focusable",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="kanban-board-overflow"]');
        const cardButtons = scope.locator('button[type="button"]');
        const count = await cardButtons.count();
        expect(count).toBeGreaterThan(0);

        await cardButtons.first().focus();
        await expect(cardButtons.first()).toBeFocused();
      },
    );
  });

  test.describe("ticket detail — sidebar control heights", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Execution core surfaces", exact: true }),
      ).toBeVisible();
    });

    test(
      "ticket detail sidebar select triggers use FIELD_CONTROL_CLASS and stand at 36 px",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="ticket-detail-two-panel"]');
        const triggers = scope.locator('[data-slot="select-trigger"]');
        const count = await triggers.count();
        expect(count).toBeGreaterThan(0);
        for (let i = 0; i < count; i += 1) {
          const box = await triggers.nth(i).boundingBox();
          expect(box).not.toBeNull();
          expect(Math.round(box?.height ?? 0)).toBe(36);
        }
      },
    );

    test(
      "ticket action buttons stand at the shared 36 px height",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="ticket-detail-two-panel"]');
        const buttons = scope.locator("button:visible");
        const count = await buttons.count();
        expect(count).toBeGreaterThan(0);
        for (let i = 0; i < count; i += 1) {
          const box = await buttons.nth(i).boundingBox();
          expect(box).not.toBeNull();
          expect(Math.round(box?.height ?? 0)).toBe(36);
        }
      },
    );

    test(
      "ticket detail uses side-by-side panels at 1280 px with main wider than sidebar",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="ticket-detail-two-panel"]');
        const mainPanel = scope.locator(".flex-1").first();
        const sidePanel = scope.locator("aside");
        const mainBox = await mainPanel.boundingBox();
        const sideBox = await sidePanel.boundingBox();
        expect(mainBox).not.toBeNull();
        expect(sideBox).not.toBeNull();
        expect(Math.abs((mainBox?.y ?? 0) - (sideBox?.y ?? 0))).toBeLessThan(20);
        expect(mainBox?.width ?? 0).toBeGreaterThan(sideBox?.width ?? 0);
      },
    );
  });

  test.describe("ticket detail — focus management", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Execution core surfaces", exact: true }),
      ).toBeVisible();
    });

    test(
      "ticket action buttons are keyboard reachable via Tab",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="ticket-detail-two-panel"]');
        const editButton = scope.getByRole("button", { name: "Edit ticket", exact: true });
        await editButton.focus();
        await expect(editButton).toBeFocused();

        await page.keyboard.press("Tab");
        const archiveButton = scope.getByRole("button", { name: "Archive ticket", exact: true });
        await expect(archiveButton).toBeFocused();
      },
    );

    test(
      "ticket sidebar select triggers are keyboard-focusable",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="ticket-detail-two-panel"]');
        const firstTrigger = scope.locator('[data-slot="select-trigger"]').first();
        await firstTrigger.focus();
        await expect(firstTrigger).toBeFocused();
      },
    );

    test(
      "first sidebar select opens with Space key, proving keyboard interaction is live",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="ticket-detail-two-panel"]');
        const firstTrigger = scope.locator('[data-slot="select-trigger"]').first();
        await firstTrigger.focus();
        await expect(firstTrigger).toBeFocused();
        await page.keyboard.press("Space");
        await expect(page.getByRole("listbox")).toBeVisible();
      },
    );

    test(
      "Esc closes the open select dropdown and returns focus to its trigger",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="ticket-detail-two-panel"]');
        const firstTrigger = scope.locator('[data-slot="select-trigger"]').first();
        await firstTrigger.focus();
        await page.keyboard.press("Space");
        await expect(page.getByRole("listbox")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("listbox")).not.toBeVisible();
        await expect(firstTrigger).toBeFocused();
      },
    );
  });

  test.describe("reduced motion — skeleton animation", () => {
    test(
      "skeleton shimmers animate when no reduced-motion preference is set",
      async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(GALLERY);
        await expect(
          page.getByRole("heading", { name: "Execution core surfaces", exact: true }),
        ).toBeVisible();

        const scope = page.locator('[data-case-frame="kanban-board-loading"]');
        const skeleton = scope.locator('[data-testid="gallery-loading-skeleton"]');
        await expect(skeleton).toBeVisible();
        const animationName = await skeleton.evaluate(
          (el) => getComputedStyle(el).animationName,
        );
        expect(animationName).not.toBe("none");
      },
    );

    test(
      "skeleton shimmers stop animating when prefers-reduced-motion is reduce",
      async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(GALLERY);
        await expect(
          page.getByRole("heading", { name: "Execution core surfaces", exact: true }),
        ).toBeVisible();

        const scope = page.locator('[data-case-frame="kanban-board-loading"]');
        const skeleton = scope.locator('[data-testid="gallery-loading-skeleton"]');
        await expect(skeleton).toBeVisible();
        const animationName = await skeleton.evaluate(
          (el) => getComputedStyle(el).animationName,
        );
        expect(animationName).toBe("none");
      },
    );
  });

  test.describe("375 px mobile — per-case-frame layout", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Execution core surfaces", exact: true }),
      ).toBeVisible();
    });

    test(
      "non-kanban case frames have no horizontal overflow at 375 px",
      async ({ page }) => {
        const FRAMES = [
          "ticket-detail-two-panel",
          "triage-rows",
          "cycle-cards",
          "module-cards",
          "epic-card",
        ] as const;
        for (const frameId of FRAMES) {
          const frame = page.locator(`[data-case-frame="${frameId}"]`);
          await expect(frame).toBeVisible();
          const overflow = await frame.evaluate(
            (el: HTMLElement) => el.scrollWidth - el.clientWidth,
          );
          expect(overflow).toBeLessThanOrEqual(1);
        }
      },
    );
  });

  test.describe("screen-reader — ARIA roles and accessible names", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Execution core surfaces", exact: true }),
      ).toBeVisible();
    });

    test(
      "kanban scroll container has region role with accessible name",
      async ({ page }) => {
        const container = page.locator('[data-testid="kanban-scroll-container"]');
        await expect(container).toHaveRole("region");
        const label = await container.getAttribute("aria-label");
        expect(label).toBeTruthy();
        expect(label?.toLowerCase()).toContain("kanban");
      },
    );

    test(
      "kanban columns each have region role with accessible name",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="kanban-board-overflow"]');
        const columns = scope.locator('[role="region"]:not([data-testid="kanban-scroll-container"])');
        const count = await columns.count();
        expect(count).toBeGreaterThan(0);
        for (let i = 0; i < count; i += 1) {
          const label = await columns.nth(i).getAttribute("aria-label");
          expect(label).toBeTruthy();
        }
      },
    );

    test(
      "ticket detail aside has accessible name describing its region",
      async ({ page }) => {
        const aside = page.locator('[data-case-frame="ticket-detail-two-panel"] aside');
        await expect(aside).toBeVisible();
        const label = await aside.getAttribute("aria-label");
        expect(label).toBe("Ticket metadata");
      },
    );

    test(
      "ticket action buttons have non-empty accessible names",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="ticket-detail-two-panel"]');
        const editButton = scope.getByRole("button", { name: "Edit ticket", exact: true });
        const archiveButton = scope.getByRole("button", { name: "Archive ticket", exact: true });
        await expect(editButton).toBeVisible();
        await expect(archiveButton).toBeVisible();
      },
    );

    test(
      "triage rows have accessible accept and decline buttons",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="triage-rows"]');
        const acceptButtons = scope.getByRole("button", { name: /Accept/i });
        const declineButtons = scope.getByRole("button", { name: /Decline/i });
        const acceptCount = await acceptButtons.count();
        const declineCount = await declineButtons.count();
        expect(acceptCount).toBeGreaterThan(0);
        expect(declineCount).toBeGreaterThan(0);
      },
    );

    test(
      "cycle cards have accessible action buttons with names scoped to their cycle",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="cycle-cards"]');
        const actionButton = scope.getByRole("button", { name: /Actions for Sprint 43/i });
        await expect(actionButton).toBeVisible();
      },
    );

    test(
      "module cards are focusable links with accessible text",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="module-cards"]');
        const links = scope.getByRole("link");
        const count = await links.count();
        expect(count).toBeGreaterThan(0);
      },
    );

    test(
      "epic card header has button role and aria-expanded attribute",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="epic-card"]');
        const header = scope.locator('[role="button"][aria-expanded]');
        await expect(header).toBeVisible();
        const expanded = await header.getAttribute("aria-expanded");
        expect(expanded).not.toBeNull();
      },
    );

    test(
      "epic card progress bar has progressbar role with value attributes",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="epic-card"]');
        const progressBar = scope.locator('[role="progressbar"]');
        await expect(progressBar).toBeVisible();
        const valueNow = await progressBar.getAttribute("aria-valuenow");
        const valueMin = await progressBar.getAttribute("aria-valuemin");
        const valueMax = await progressBar.getAttribute("aria-valuemax");
        expect(valueMin).toBe("0");
        expect(valueMax).toBe("100");
        expect(valueNow).not.toBeNull();
      },
    );
  });

  test.describe("triage rows — keyboard reachability", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Execution core surfaces", exact: true }),
      ).toBeVisible();
    });

    test(
      "first triage row open button is keyboard focusable",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="triage-rows"]');
        const openButton = scope.locator('button[aria-label^="Open ticket"]').first();
        await openButton.focus();
        await expect(openButton).toBeFocused();
      },
    );

    test(
      "triage accept button is keyboard reachable via Tab from the open button",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="triage-rows"]');
        const openButton = scope.locator('button[aria-label^="Open ticket"]').first();
        await openButton.focus();
        await page.keyboard.press("Tab");
        const acceptButton = scope.getByRole("button", { name: /Accept/i }).first();
        await expect(acceptButton).toBeFocused();
      },
    );
  });

  test.describe("cycle card — keyboard focus", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Execution core surfaces", exact: true }),
      ).toBeVisible();
    });

    test(
      "cycle card action button is keyboard-focusable",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="cycle-cards"]');
        const actionButton = scope.getByRole("button", { name: /Actions for Sprint 43/i });
        await actionButton.focus();
        await expect(actionButton).toBeFocused();
      },
    );

    test(
      "Esc closes the cycle action dropdown and returns focus to its trigger",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="cycle-cards"]');
        const actionButton = scope.getByRole("button", { name: /Actions for Sprint 43/i });
        await actionButton.focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("menu")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("menu")).not.toBeVisible();
        await expect(actionButton).toBeFocused();
      },
    );
  });

  test.describe("module card — keyboard focus", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Execution core surfaces", exact: true }),
      ).toBeVisible();
    });

    test(
      "module cards are keyboard-focusable as links",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="module-cards"]');
        const firstLink = scope.getByRole("link").first();
        await firstLink.focus();
        await expect(firstLink).toBeFocused();
      },
    );
  });

  test.describe("epic card — keyboard expand", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Execution core surfaces", exact: true }),
      ).toBeVisible();
    });

    test(
      "epic card header is keyboard focusable",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="epic-card"]');
        const header = scope.locator('[role="button"][aria-expanded]');
        await header.focus();
        await expect(header).toBeFocused();
      },
    );

    test(
      "pressing Enter on the epic card header toggles aria-expanded",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="epic-card"]');
        const header = scope.locator('[role="button"][aria-expanded]');
        await header.focus();
        await expect(header).toBeFocused();
        const before = await header.getAttribute("aria-expanded");
        await page.keyboard.press("Enter");
        const after = await header.getAttribute("aria-expanded");
        expect(after).not.toBe(before);
      },
    );
  });

  test.describe("module card — reduced-motion transition suppression", () => {
    test(
      "module card article has CSS transition with no-preference",
      async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(GALLERY);
        await expect(
          page.getByRole("heading", { name: "Execution core surfaces", exact: true }),
        ).toBeVisible();

        const scope = page.locator('[data-case-frame="module-cards"]');
        const article = scope.locator("article").first();
        await expect(article).toBeVisible();
        const transitionProperty = await article.evaluate(
          (el) => getComputedStyle(el).transitionProperty,
        );
        expect(transitionProperty).not.toBe("none");
      },
    );

    test(
      "module card article transition is suppressed under prefers-reduced-motion: reduce",
      async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(GALLERY);
        await expect(
          page.getByRole("heading", { name: "Execution core surfaces", exact: true }),
        ).toBeVisible();

        const scope = page.locator('[data-case-frame="module-cards"]');
        const article = scope.locator("article").first();
        await expect(article).toBeVisible();
        const transitionProperty = await article.evaluate(
          (el) => getComputedStyle(el).transitionProperty,
        );
        expect(transitionProperty).toBe("none");
      },
    );
  });
});
