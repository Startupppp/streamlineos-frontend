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
          page.getByRole("heading", { name: "Execution core surfaces" }),
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

  test.describe("kanban board — horizontal overflow", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Execution core surfaces" }),
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
        page.getByRole("heading", { name: "Execution core surfaces" }),
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
        page.getByRole("heading", { name: "Execution core surfaces" }),
      ).toBeVisible();
    });

    test(
      "ticket action buttons are keyboard reachable via Tab",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="ticket-detail-two-panel"]');
        const editButton = scope.getByRole("button", { name: "Edit ticket" });
        await editButton.focus();
        await expect(editButton).toBeFocused();

        await page.keyboard.press("Tab");
        const archiveButton = scope.getByRole("button", { name: "Archive ticket" });
        await expect(archiveButton).toBeFocused();
      },
    );

    test(
      "ticket sidebar select triggers are keyboard reachable",
      async ({ page }) => {
        const scope = page.locator('[data-case-frame="ticket-detail-two-panel"]');
        const firstTrigger = scope.locator('[data-slot="select-trigger"]').first();
        await firstTrigger.focus();
        await expect(firstTrigger).toBeFocused();
      },
    );
  });
});
