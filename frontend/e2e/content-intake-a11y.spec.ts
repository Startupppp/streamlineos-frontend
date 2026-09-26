import { expect, test, type Locator, type Page } from "@playwright/test";

const GALLERY = "/design-system/content-intake";

const VIEWPORTS = [
  { name: "375x812", width: 375, height: 812 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1280x800", width: 1280, height: 800 },
] as const;

const CASES = [
  "public-whiteboard-view",
  "public-whiteboard-edit",
  "public-form",
  "public-intake",
] as const;

function frame(page: Page, caseId: string): Locator {
  return page.locator(`[data-case-frame="${caseId}"]`);
}

async function horizontalOverflowOf(locator: Locator): Promise<number> {
  return locator.evaluate(
    (node: HTMLElement) => node.scrollWidth - node.clientWidth,
  );
}

test.describe("Content intake public surfaces — responsive contract", () => {
  for (const viewport of VIEWPORTS) {
    test.describe(viewport.name, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(GALLERY);
        await expect(
          page.getByRole("heading", { name: "Content intake public surfaces" }),
        ).toBeVisible();
      });

      test("the gallery page itself never scrolls sideways", async ({ page }) => {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
      });

      test("no case frame overflows its own width", async ({ page }) => {
        const overflows: Record<string, number> = {};
        for (const caseId of CASES) {
          const scope = frame(page, caseId);
          overflows[caseId] = await horizontalOverflowOf(scope);
        }
        const spilling = Object.entries(overflows).filter(([, px]) => px > 1);
        expect(spilling).toEqual([]);
      });

      test("every visible text input and textarea is at least 36px tall", async ({ page }) => {
        for (const caseId of ["public-form", "public-intake"] as const) {
          const scope = frame(page, caseId);
          const inputs = scope.locator("input:visible, textarea:visible");
          const count = await inputs.count();
          expect(count).toBeGreaterThan(0);
          for (let i = 0; i < count; i += 1) {
            const box = await inputs.nth(i).boundingBox();
            expect(box).not.toBeNull();
            expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(36);
          }
        }
      });
    });
  }

  test.describe("whiteboard frames — capability indicator", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Content intake public surfaces" }),
      ).toBeVisible();
    });

    test("view-mode frame shows the board name from stub data", async ({ page }) => {
      const scope = frame(page, "public-whiteboard-view");
      await expect(scope.getByText("Sprint planning board")).toBeVisible();
    });

    test("view-mode frame shows the View only badge", async ({ page }) => {
      const scope = frame(page, "public-whiteboard-view");
      await expect(scope.getByText("View only")).toBeVisible();
    });

    test("edit-mode frame shows the board name from stub data", async ({ page }) => {
      const scope = frame(page, "public-whiteboard-edit");
      await expect(scope.getByText("Architecture overview")).toBeVisible();
    });

    test("edit-mode frame does not show View only badge", async ({ page }) => {
      const scope = frame(page, "public-whiteboard-edit");
      await expect(scope.getByText("View only")).toHaveCount(0);
    });

    test("the share token never appears as visible text in whiteboard frames", async ({ page }) => {
      for (const caseId of ["public-whiteboard-view", "public-whiteboard-edit"] as const) {
        const scope = frame(page, caseId);
        const text = await scope.evaluate((el: HTMLElement) => el.textContent ?? "");
        expect(text).not.toContain("gallery-view-stub");
        expect(text).not.toContain("gallery-edit-stub");
      }
    });
  });

  test.describe("public-form — real form fields accessible and keyboard-ordered", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Content intake public surfaces" }),
      ).toBeVisible();
    });

    test("form renders with the stub form name as h1", async ({ page }) => {
      const scope = frame(page, "public-form");
      await expect(scope.getByRole("heading", { name: "Feedback form" })).toBeVisible();
    });

    test("form fields are labelled and visible", async ({ page }) => {
      const scope = frame(page, "public-form");
      await expect(scope.getByLabel("Your name")).toBeVisible();
      await expect(scope.getByLabel(/Email address/)).toBeVisible();
      await expect(scope.getByLabel(/Message/)).toBeVisible();
    });

    test("Tab moves through name → email → message in DOM order", async ({ page }) => {
      const scope = frame(page, "public-form");
      const nameInput = scope.locator("#field-name");
      const emailInput = scope.locator("#field-email");
      const messageInput = scope.locator("#field-message");

      await nameInput.focus();
      await expect(nameInput).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(emailInput).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(messageInput).toBeFocused();
    });

    test("form token never appears as visible text in the form frame", async ({ page }) => {
      const scope = frame(page, "public-form");
      const text = await scope.evaluate((el: HTMLElement) => el.textContent ?? "");
      expect(text).not.toContain("gallery-form-stub");
    });
  });

  test.describe("public-intake — legacy intake form keyboard-ordered", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Content intake public surfaces" }),
      ).toBeVisible();
    });

    test("intake form renders with the default h1", async ({ page }) => {
      const scope = frame(page, "public-intake");
      await expect(scope.getByRole("heading", { name: "Submit a request" })).toBeVisible();
    });

    test("intake title field is labelled and comes first", async ({ page }) => {
      const scope = frame(page, "public-intake");
      await expect(scope.getByLabel(/Request title/)).toBeVisible();
    });

    test("Tab enters title then proceeds through type and priority selects", async ({ page }) => {
      const scope = frame(page, "public-intake");
      const titleInput = scope.locator("#intake-title");
      const typeTrigger = scope.locator("#intake-type");
      const priorityTrigger = scope.locator("#intake-priority");

      await titleInput.focus();
      await expect(titleInput).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(typeTrigger).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(priorityTrigger).toBeFocused();
    });

    test("project id never appears as visible text in the intake frame", async ({ page }) => {
      const scope = frame(page, "public-intake");
      const text = await scope.evaluate((el: HTMLElement) => el.textContent ?? "");
      expect(text).not.toContain("gallery-intake-stub");
    });
  });
});
