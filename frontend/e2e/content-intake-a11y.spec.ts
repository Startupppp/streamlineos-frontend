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
  "public-board-loading",
  "public-roadmap",
] as const;

function frame(page: Page, caseId: string): Locator {
  return page.locator(`[data-case-frame="${caseId}"]`);
}

async function horizontalOverflowOf(locator: Locator): Promise<number> {
  return locator.evaluate(
    (node: HTMLElement) => node.scrollWidth - node.clientWidth,
  );
}

async function shimmerAnimationName(page: Page): Promise<string> {
  const shimmer = frame(page, "public-board-loading")
    .locator(".skeleton-shimmer.animate-pulse:visible")
    .first();
  await expect(shimmer).toBeVisible();
  return shimmer.evaluate(
    (node: HTMLElement) => getComputedStyle(node).animationName,
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
        for (const caseId of ["public-form", "public-intake", "public-roadmap"] as const) {
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

    test("the share token never appears as visible text in whiteboard frames and the board name is shown instead", async ({ page }) => {
      const viewScope = frame(page, "public-whiteboard-view");
      const viewText = await viewScope.evaluate((el: HTMLElement) => el.textContent ?? "");
      expect(viewText).not.toContain("gallery-view-stub");
      expect(viewText).not.toContain("gallery-edit-stub");
      await expect(viewScope.getByText("Sprint planning board")).toBeVisible();

      const editScope = frame(page, "public-whiteboard-edit");
      const editText = await editScope.evaluate((el: HTMLElement) => el.textContent ?? "");
      expect(editText).not.toContain("gallery-view-stub");
      expect(editText).not.toContain("gallery-edit-stub");
      await expect(editScope.getByText("Architecture overview")).toBeVisible();
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

    test("form token never appears as visible text in the form frame and the form heading is shown instead", async ({ page }) => {
      const scope = frame(page, "public-form");
      const text = await scope.evaluate((el: HTMLElement) => el.textContent ?? "");
      expect(text).not.toContain("gallery-form-stub");
      await expect(scope.getByRole("heading", { name: "Feedback form", exact: true })).toBeVisible();
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

    test("project id never appears as visible text in the intake frame and the intake heading is shown instead", async ({ page }) => {
      const scope = frame(page, "public-intake");
      const text = await scope.evaluate((el: HTMLElement) => el.textContent ?? "");
      expect(text).not.toContain("gallery-intake-stub");
      await expect(scope.getByRole("heading", { name: "Submit a request", exact: true })).toBeVisible();
    });
  });

  test.describe("reduced motion — public board loading skeleton stops", () => {
    test.describe("with reduce requested", () => {
      test.use({ contextOptions: { reducedMotion: "reduce" } });

      test("public board loading skeleton computes animation-name none on the visible shimmer", async ({
        page,
      }) => {
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

  test.describe("high-density desktop — 1920×1080 scale 2", () => {
    test.use({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });

    test.beforeEach(async ({ page }) => {
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Content intake public surfaces" }),
      ).toBeVisible();
    });

    test("the gallery page itself never scrolls sideways at scale 2", async ({ page }) => {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test("no case frame overflows its own width at scale 2", async ({ page }) => {
      const overflows: Record<string, number> = {};
      for (const caseId of CASES) {
        const scope = frame(page, caseId);
        overflows[caseId] = await horizontalOverflowOf(scope);
      }
      const spilling = Object.entries(overflows).filter(([, px]) => px > 1);
      expect(spilling).toEqual([]);
    });

    test("gallery heading right edge is within the viewport at scale 2", async ({ page }) => {
      const heading = page.getByRole("heading", { name: "Content intake public surfaces", exact: true });
      const box = await heading.boundingBox();
      const vw = await page.evaluate(() => document.documentElement.clientWidth);
      expect(box).not.toBeNull();
      expect(Math.ceil((box?.x ?? 0) + (box?.width ?? 0))).toBeLessThanOrEqual(vw);
    });
  });

  test.describe("public-whiteboard — accessible board name and decorative icon", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Content intake public surfaces" }),
      ).toBeVisible();
    });

    test("whiteboard header element is visible and contains the stub board name", async ({ page }) => {
      const scope = frame(page, "public-whiteboard-view");
      const header = scope.locator("header").first();
      await expect(header).toBeVisible();
      await expect(header.getByText("Sprint planning board")).toBeVisible();
    });

    test("Eye icon in the View only badge carries aria-hidden and is not exposed as an unnamed image", async ({ page }) => {
      const scope = frame(page, "public-whiteboard-view");
      const header = scope.locator("header").first();
      const unnamedSvg = header.locator(
        "svg:not([aria-hidden='true']):not([aria-label]):not([aria-labelledby])",
      );
      await expect(unnamedSvg).toHaveCount(0);
    });
  });

  test.describe("public-roadmap — accessible landmarks, headings and secret redaction", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Content intake public surfaces" }),
      ).toBeVisible();
    });

    test("roadmap frame has a main landmark", async ({ page }) => {
      const scope = frame(page, "public-roadmap");
      await expect(scope.getByRole("main")).toBeVisible();
    });

    test("h1 shows the stub organisation name", async ({ page }) => {
      const scope = frame(page, "public-roadmap");
      await expect(
        scope.getByRole("heading", { name: "Gallery Org", exact: true }),
      ).toBeVisible();
    });

    test("roadmap item Upvote button carries an accessible name", async ({ page }) => {
      const scope = frame(page, "public-roadmap");
      await expect(scope.getByRole("button", { name: "Upvote", exact: true })).toBeVisible();
    });

    test("org identifier never appears as visible text and the org name heading is shown instead", async ({ page }) => {
      const scope = frame(page, "public-roadmap");
      const text = await scope.evaluate((el: HTMLElement) => el.textContent ?? "");
      expect(text).not.toContain("undefined");
      await expect(
        scope.getByRole("heading", { name: "Gallery Org", exact: true }),
      ).toBeVisible();
    });
  });

  test.describe("public-roadmap — feedback form keyboard-ordered", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Content intake public surfaces" }),
      ).toBeVisible();
    });

    test("roadmap item Upvote button is reachable by keyboard focus", async ({ page }) => {
      const scope = frame(page, "public-roadmap");
      const voteBtn = scope.getByRole("button", { name: "Upvote", exact: true });
      await voteBtn.focus();
      await expect(voteBtn).toBeFocused();
    });

    test("Tab from feedback title input proceeds to the details textarea in DOM order", async ({ page }) => {
      const scope = frame(page, "public-roadmap");
      const titleInput = scope.getByPlaceholder("What would you like to see?");
      const detailsTextarea = scope.getByPlaceholder("Describe your idea or problem");
      await expect(titleInput).toBeEnabled();
      await titleInput.focus();
      await expect(titleInput).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(detailsTextarea).toBeFocused();
    });
  });
});
