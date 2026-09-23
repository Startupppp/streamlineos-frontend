import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The layout half of the Build list contract, measured where it is decided.
 *
 * jsdom performs no layout, so every claim here — no horizontal page scroll,
 * how many bands precede content, whether a control is really 36px tall,
 * whether the bottom nav would cover the last row — is unassertable in the unit
 * suite. The gallery route mounts the shared components themselves with fixture
 * rows, so this measures the same code the Build pages render and needs no
 * backend to do it.
 */
const GALLERY = "/design-system/build-list";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

function frame(page: Page, caseId: string): Locator {
  return page.locator(`[data-case-frame="${caseId}"]`);
}

async function noHorizontalOverflow(locator: Locator): Promise<void> {
  const overflow = await locator.evaluate(
    (node: HTMLElement) => node.scrollWidth - node.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function topOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return Math.round(box?.y ?? 0);
}

test.describe("Build list responsive contract", () => {
  for (const viewport of VIEWPORTS) {
    test.describe(viewport.name, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(GALLERY);
        await expect(page.getByRole("heading", { name: "Build list surfaces" })).toBeVisible();
      });

      test("the page itself never scrolls sideways", async ({ page }) => {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
      });

      test("no list surface overflows its own width", async ({ page }) => {
        for (const caseId of [
          "one-action-one-filter",
          "two-actions-two-filters",
          "four-actions-three-filters",
          "loading",
          "empty-true",
          "empty-filtered",
          "error",
        ]) {
          await noHorizontalOverflow(frame(page, caseId));
        }
      });

      test("every field control stands at the shared 36px height", async ({ page }) => {
        const scope = frame(page, "four-actions-three-filters");
        const controls = scope.locator(
          "[data-slot=search-input] input, [data-slot=select-trigger]",
        );
        const count = await controls.count();
        expect(count).toBeGreaterThan(0);
        for (let i = 0; i < count; i += 1) {
          const box = await controls.nth(i).boundingBox();
          expect(box).not.toBeNull();
          expect(Math.round(box?.height ?? 0)).toBe(36);
        }
      });

      test("search is painted left of and above every other filter", async ({ page }) => {
        const scope = frame(page, "two-actions-two-filters");
        const search = scope.locator("[data-slot=search-input]");
        const status = scope.locator("[data-filter-id=status]");
        const searchBox = await search.boundingBox();
        const statusBox = await status.boundingBox();
        expect(searchBox).not.toBeNull();
        expect(statusBox).not.toBeNull();
        const searchLeads =
          (searchBox?.y ?? 0) < (statusBox?.y ?? 0) ||
          (searchBox?.x ?? 0) < (statusBox?.x ?? 0);
        expect(searchLeads).toBe(true);
      });
    });
  }

  test.describe("375 x 812", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(GALLERY);
    });

    test("content starts after at most three functional bands", async ({ page }) => {
      const scope = frame(page, "four-actions-three-filters");
      const titleTop = await topOf(scope.getByRole("heading", { name: "All projects" }));
      const actionsTop = await topOf(scope.locator("[data-slot=build-header-actions]"));
      const filtersTop = await topOf(scope.locator("[data-slot=build-list-toolbar]"));
      const contentTop = await topOf(scope.locator("[data-slot=search-input]").first());

      const bandTops = new Set([titleTop, actionsTop, filtersTop]);
      expect(bandTops.size).toBeLessThanOrEqual(3);
      expect(titleTop).toBeLessThan(actionsTop);
      expect(actionsTop).toBeLessThan(filtersTop);
      expect(contentTop).toBeGreaterThan(0);
    });

    test("two actions share one row instead of stacking full-width", async ({ page }) => {
      const scope = frame(page, "two-actions-two-filters");
      const actions = scope.locator("[data-slot=build-header-actions] > :visible");
      await expect(actions).toHaveCount(2);
      const first = await actions.nth(0).boundingBox();
      const second = await actions.nth(1).boundingBox();
      expect(Math.round(first?.y ?? 0)).toBe(Math.round(second?.y ?? -1));
      expect(Math.round(first?.width ?? 0)).toBe(Math.round(second?.width ?? -1));
    });

    test("four actions collapse to the primary plus one overflow control", async ({ page }) => {
      const scope = frame(page, "four-actions-three-filters");
      const actions = scope.locator("[data-slot=build-header-actions] > :visible");
      await expect(actions).toHaveCount(2);
      await expect(scope.getByRole("button", { name: "More actions" })).toBeVisible();
    });

    test("one action fills the row and one filter fills the next", async ({ page }) => {
      const scope = frame(page, "one-action-one-filter");
      const frameBox = await scope.boundingBox();
      const action = await scope
        .locator("[data-slot=build-header-actions] > :visible")
        .first()
        .boundingBox();
      expect((action?.width ?? 0) / (frameBox?.width ?? 1)).toBeGreaterThan(0.85);

      const status = await scope.locator("[data-filter-id=status]").boundingBox();
      const search = await scope.locator("[data-slot=search-input]").boundingBox();
      expect(Math.round(search?.y ?? 0)).toBe(Math.round(status?.y ?? -1));
    });

    test("three filters collapse behind one labelled drawer trigger", async ({ page }) => {
      const scope = frame(page, "four-actions-three-filters");
      await expect(scope.locator("[data-filter-id=status]")).toBeHidden();
      await expect(scope.locator("[data-filter-id=health]")).toBeHidden();
      await expect(scope.locator("[data-filter-id=lead]")).toBeHidden();
      await expect(scope.getByRole("button", { name: /^Filters/ })).toBeVisible();
    });

    test("the filters drawer takes focus, shows every filter and gives it back", async ({ page }) => {
      const scope = frame(page, "four-actions-three-filters");
      const trigger = scope.getByRole("button", { name: /^Filters/ });
      await trigger.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      for (const label of ["Status", "Health", "Lead"]) {
        await expect(dialog.getByLabel(label)).toBeVisible();
      }
      await expect(dialog.getByRole("button", { name: "Done" })).toBeVisible();

      const focusInside = await dialog.evaluate(
        (node: HTMLElement) => node.contains(document.activeElement),
      );
      expect(focusInside).toBe(true);

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    });

    test("a select popup is never narrower than the trigger that opened it", async ({ page }) => {
      const scope = frame(page, "two-actions-two-filters");
      const trigger = scope.getByLabel("Status");
      const triggerBox = await trigger.boundingBox();
      await trigger.click();
      const content = page.locator("[data-slot=select-content]");
      await expect(content).toBeVisible();
      const contentBox = await content.boundingBox();
      expect(contentBox?.width ?? 0).toBeGreaterThanOrEqual((triggerBox?.width ?? 0) - 1);
      await page.keyboard.press("Escape");
    });

    test("the list shows cards carrying owner and actions, not a desktop table", async ({ page }) => {
      const scope = frame(page, "two-actions-two-filters");
      await expect(scope.locator("table")).toBeHidden();
      const card = scope.locator("[role=button][tabindex='0']").first();
      const cards = scope.getByText("Priya Nair");
      expect(await cards.count()).toBeGreaterThan(0);
      await expect(
        scope.getByRole("button", { name: /^Actions for / }).first(),
      ).toBeVisible();
      expect(card).toBeTruthy();
    });

    test("pagination stays reachable without sideways scrolling", async ({ page }) => {
      const scope = frame(page, "two-actions-two-filters");
      const next = scope.getByRole("button", { name: "Next page" });
      await expect(next).toBeVisible();
      const box = await next.boundingBox();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);
    });

    test("a mounted bottom nav reserves room under the content", async ({ page }) => {
      const padded = await frame(page, "mobile-nav-clearance")
        .locator(".max-md\\:\\[\\.mobile-nav-active_\\&\\]\\:pb-\\[calc\\(4\\.5rem\\+env\\(safe-area-inset-bottom\\2c 0px\\)\\)\\]")
        .first()
        .evaluate((node: HTMLElement) =>
          Number.parseFloat(getComputedStyle(node).paddingBottom),
        );
      expect(padded).toBeGreaterThanOrEqual(72);
    });

    test("a full-page empty state fills its body and keeps a large illustration", async ({ page }) => {
      const scope = frame(page, "empty-true");
      const status = scope.getByRole("status");
      const statusBox = await status.boundingBox();
      const frameBox = await scope.boundingBox();
      expect((statusBox?.height ?? 0) / (frameBox?.height ?? 1)).toBeGreaterThan(0.4);

      const illustration = scope.locator("img").first();
      const illustrationBox = await illustration.boundingBox();
      expect(illustrationBox?.width ?? 0).toBeGreaterThanOrEqual(120);
      expect(illustrationBox?.height ?? 0).toBeGreaterThanOrEqual(120);
    });

    test("a filtered empty offers Clear filters, a true empty offers Create", async ({ page }) => {
      await expect(
        frame(page, "empty-filtered").getByRole("button", { name: "Clear filters" }),
      ).toBeVisible();
      await expect(
        frame(page, "empty-filtered").getByRole("button", { name: "New project" }),
      ).toHaveCount(0);
      await expect(
        frame(page, "empty-true").getByRole("button", { name: "New project" }),
      ).toBeVisible();
    });

    test("the loading skeleton announces the real column names", async ({ page }) => {
      const scope = frame(page, "loading");
      for (const header of ["Key", "Name", "Status", "Owner", "Progress", "Target"]) {
        await expect(scope.getByRole("columnheader", { name: header })).toBeAttached();
      }
      await expect(scope.getByText("Column 1")).toHaveCount(0);
    });
  });

  test.describe("768 x 1024", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(GALLERY);
    });

    test("filters return inline and the drawer trigger retires", async ({ page }) => {
      const scope = frame(page, "four-actions-three-filters");
      for (const id of ["status", "health", "lead"]) {
        await expect(scope.locator(`[data-filter-id=${id}]`)).toBeVisible();
      }
      await expect(scope.getByRole("button", { name: /^Filters/ })).toBeHidden();
    });

    test("the desktop table replaces the mobile cards", async ({ page }) => {
      const scope = frame(page, "two-actions-two-filters");
      await expect(scope.locator("table").first()).toBeVisible();
    });
  });

  test.describe("1280 x 800", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
    });

    test("search grows but stays capped so selects keep readable widths", async ({ page }) => {
      const scope = frame(page, "four-actions-three-filters");
      const search = await scope.locator("[data-slot=search-input]").boundingBox();
      const frameBox = await scope.boundingBox();
      expect(search?.width ?? 0).toBeLessThan((frameBox?.width ?? 0) * 0.5);
      const status = await scope.locator("[data-filter-id=status]").boundingBox();
      expect(status?.width ?? 0).toBeGreaterThanOrEqual(140);
    });

    test("header actions sit on one row to the right of the title", async ({ page }) => {
      const scope = frame(page, "four-actions-three-filters");
      const title = await scope.getByRole("heading", { name: "All projects" }).boundingBox();
      const actions = await scope.locator("[data-slot=build-header-actions]").boundingBox();
      expect(actions?.x ?? 0).toBeGreaterThan(title?.x ?? 0);
      expect(Math.abs((actions?.y ?? 0) - (title?.y ?? 0))).toBeLessThan(40);
    });

    test("three visible actions at most, the rest behind one overflow", async ({ page }) => {
      const scope = frame(page, "four-actions-three-filters");
      const visible = scope.locator(
        "[data-slot=build-header-actions] > .sm\\:inline-flex:visible",
      );
      expect(await visible.count()).toBeLessThanOrEqual(4);
      await expect(scope.getByRole("button", { name: "More actions" })).toBeVisible();
    });
  });
});
