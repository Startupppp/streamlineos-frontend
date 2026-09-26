import { expect, test, type Locator, type Page } from "@playwright/test";

const GALLERY = "/design-system/managed-products";
const EVIDENCE_DIR = "test-results/managed-products-evidence";

async function shimmerAnimationName(page: Page): Promise<string> {
  const shimmer = page
    .locator('[data-case-frame="loading"]')
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

const CASES = [
  "ready",
  "ready-two-actions",
  "loading",
  "empty-true",
  "empty-filtered",
  "error",
  "denied",
] as const;

function frame(page: Page, caseId: string): Locator {
  return page.locator(`[data-case-frame="${caseId}"]`);
}

async function horizontalOverflowOf(locator: Locator): Promise<number> {
  return locator.evaluate(
    (node: HTMLElement) => node.scrollWidth - node.clientWidth,
  );
}

test.describe("Managed Products responsive contract", () => {
  for (const viewport of VIEWPORTS) {
    test.describe(viewport.name, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(GALLERY);
        await expect(
          page.getByRole("heading", { name: "Managed Products surfaces" }),
        ).toBeVisible();
      });

      test("the page itself never scrolls sideways", async ({ page }) => {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
      });

      test("no managed-products surface overflows its own width", async ({ page }, testInfo) => {
        const overflows: Record<string, number> = {};
        for (const caseId of CASES) {
          const scope = frame(page, caseId);
          overflows[caseId] = await horizontalOverflowOf(scope);
          const shot = `${EVIDENCE_DIR}/${caseId}__${viewport.name}.png`;
          await scope.screenshot({ path: shot });
          await testInfo.attach(`${caseId}__${viewport.name}`, {
            path: shot,
            contentType: "image/png",
          });
        }
        const spilling = Object.entries(overflows).filter(([, px]) => px > 1);
        expect(spilling).toEqual([]);
      });

      test("every field control stands at the shared 36px height", async ({ page }) => {
        const scope = frame(page, "ready");
        const controls = scope.locator(
          "[data-slot=search-input] input:visible, [data-slot=select-trigger]:visible",
        );
        const count = await controls.count();
        expect(count).toBeGreaterThan(0);
        for (let i = 0; i < count; i += 1) {
          const box = await controls.nth(i).boundingBox();
          expect(box).not.toBeNull();
          expect(Math.round(box?.height ?? 0)).toBe(36);
        }
      });

      test("search is always visible; at mobile filters collapse into a drawer trigger", async ({ page }) => {
        const scope = frame(page, "ready");
        const search = scope.locator("[data-slot=search-input]");
        await expect(search).toBeVisible();

        if (viewport.width < 768) {
          await expect(scope.getByRole("button", { name: /^Filters/ })).toBeVisible();
          await expect(scope.locator("[data-filter-id=status]")).toBeHidden();
        } else {
          const status = scope.locator("[data-filter-id=status]");
          await expect(status).toBeVisible();
          const searchBox = await search.boundingBox();
          const statusBox = await status.boundingBox();
          expect(searchBox).not.toBeNull();
          expect(statusBox).not.toBeNull();
          const searchLeads =
            (searchBox?.y ?? 0) < (statusBox?.y ?? 0) ||
            (searchBox?.x ?? 0) < (statusBox?.x ?? 0);
          expect(searchLeads).toBe(true);
        }
      });

      test("the denied case shows access-restricted text and never looks like empty", async ({
        page,
      }) => {
        const scope = frame(page, "denied");
        await expect(scope.getByText(/access restricted/i)).toBeVisible();
        await expect(scope.getByText(/no managed products yet/i)).not.toBeVisible();
      });

      test("the error case shows a failure message, not a blank screen", async ({ page }) => {
        const scope = frame(page, "error");
        await expect(
          scope.getByText(/could not load your managed products/i),
        ).toBeVisible();
      });
    });
  }

  test.describe("375 x 812", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(GALLERY);
    });

    test("the list shows mobile cards carrying owner and action button", async ({ page }) => {
      const scope = frame(page, "ready");
      await expect(scope.locator("table")).toBeHidden();
      await expect(scope.getByText("Priya Nair").first()).toBeVisible();
      await expect(
        scope.getByRole("button", { name: /^Actions for / }).first(),
      ).toBeVisible();
    });

    test("two actions share one row instead of stacking full-width", async ({ page }) => {
      const scope = frame(page, "ready-two-actions");
      const actions = scope.locator("[data-slot=build-header-actions] > :visible");
      await expect(actions).toHaveCount(2);
      const first = await actions.nth(0).boundingBox();
      const second = await actions.nth(1).boundingBox();
      expect(Math.round(first?.y ?? 0)).toBe(Math.round(second?.y ?? -1));
    });

    test("status and sort filters collapse behind one labelled drawer trigger", async ({
      page,
    }) => {
      const scope = frame(page, "ready");
      await expect(scope.locator("[data-filter-id=status]")).toBeHidden();
      await expect(scope.locator("[data-filter-id=sort]")).toBeHidden();
      await expect(scope.getByRole("button", { name: /^Filters/ })).toBeVisible();
    });

    test("the filters drawer takes focus, shows every filter and gives it back", async ({
      page,
    }) => {
      const scope = frame(page, "ready");
      const trigger = scope.getByRole("button", { name: /^Filters/ });
      await trigger.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      for (const label of ["Status", "Sort"]) {
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

    test("pagination stays reachable without sideways scrolling", async ({ page }) => {
      const scope = frame(page, "ready");
      const next = scope.getByRole("button", { name: "Next page" });
      await expect(next).toBeVisible();
      const box = await next.boundingBox();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);
    });

    test("a full-page empty state fills its body and keeps a large illustration", async ({
      page,
    }) => {
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

    test("a filtered empty offers Clear filters, a true empty offers Create", async ({
      page,
    }) => {
      const filtered = frame(page, "empty-filtered").getByRole("status");
      await expect(
        filtered.getByRole("button", { name: "Clear filters" }),
      ).toBeVisible();
      await expect(
        filtered.getByRole("button", { name: "New product" }),
      ).toHaveCount(0);
      await expect(filtered.getByText(/No results match your filters/)).toBeVisible();

      const trueEmpty = frame(page, "empty-true").getByRole("status");
      await expect(
        trueEmpty.getByRole("button", { name: "New product" }),
      ).toBeVisible();
      await expect(
        trueEmpty.getByRole("button", { name: "Clear filters" }),
      ).toHaveCount(0);
      await expect(trueEmpty.getByText("No managed products yet")).toBeVisible();
    });

    test("the loading skeleton is card-shaped at mobile width", async ({ page }) => {
      const scope = frame(page, "loading");
      await expect(scope.locator("table")).toBeHidden();
      const cards = scope.locator("[class*='sm:hidden'] > div");
      await expect(cards.first()).toBeVisible();
    });

    test("a mounted bottom nav reserves room under the content", async ({ page }) => {
      const padded = await frame(page, "mobile-nav-clearance")
        .locator(
          ".max-md\\:\\[\\.mobile-nav-active_\\&\\]\\:pb-\\[calc\\(4\\.5rem\\+env\\(safe-area-inset-bottom\\2c 0px\\)\\)\\]",
        )
        .first()
        .evaluate((node: HTMLElement) =>
          Number.parseFloat(getComputedStyle(node).paddingBottom),
        );
      expect(padded).toBeGreaterThanOrEqual(72);
    });
  });

  test.describe("768 x 1024", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(GALLERY);
    });

    test("filters return inline and the drawer trigger retires", async ({ page }) => {
      const scope = frame(page, "ready");
      for (const id of ["status", "sort"]) {
        await expect(scope.locator(`[data-filter-id=${id}]`)).toBeVisible();
      }
      await expect(scope.getByRole("button", { name: /^Filters/ })).toBeHidden();
    });

    test("the desktop table replaces the mobile cards", async ({ page }) => {
      const scope = frame(page, "ready");
      await expect(scope.locator("table").first()).toBeVisible();
    });

    test("the loading skeleton announces the real column names", async ({ page }) => {
      const scope = frame(page, "loading");
      for (const header of ["Name", "Key", "Status", "Owner", "Description"]) {
        await expect(scope.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
      }
    });
  });

  test.describe("1280 x 800", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
    });

    test("search grows but stays capped so selects keep readable widths", async ({ page }) => {
      const scope = frame(page, "ready");
      const search = await scope.locator("[data-slot=search-input]").boundingBox();
      const frameBox = await scope.boundingBox();
      expect(search?.width ?? 0).toBeLessThan((frameBox?.width ?? 0) * 0.5);
      const status = await scope.locator("[data-filter-id=status]").boundingBox();
      expect(status?.width ?? 0).toBeGreaterThanOrEqual(120);
    });

    test("header actions sit on one row to the right of the title", async ({ page }) => {
      const scope = frame(page, "ready");
      const title = await scope
        .getByRole("heading", { name: "Managed Products" })
        .boundingBox();
      const actions = await scope
        .locator("[data-slot=build-header-actions]")
        .boundingBox();
      expect(actions?.x ?? 0).toBeGreaterThan(title?.x ?? 0);
      expect(Math.abs((actions?.y ?? 0) - (title?.y ?? 0))).toBeLessThan(40);
    });

    test("product names are not truncated at viewport width", async ({ page }) => {
      const scope = frame(page, "ready");
      const firstLink = scope.locator("table a").first();
      await expect(firstLink).toBeVisible();
      const box = await firstLink.boundingBox();
      expect((box?.width ?? 0) + (box?.x ?? 0)).toBeLessThanOrEqual(1280);
    });
  });

  test.describe("sub-page skeleton and empty-state cases", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Managed Products surfaces" }),
      ).toBeVisible();
    });

    test("feedback-loading exposes table column headers for screen readers", async ({ page }) => {
      const scope = frame(page, "feedback-loading");
      await expect(scope.getByRole("columnheader", { name: "Type", exact: true })).toBeVisible();
      await expect(scope.getByRole("columnheader", { name: "Status", exact: true })).toBeVisible();
      await expect(scope.getByRole("columnheader", { name: "Age", exact: true })).toBeVisible();
    });

    test("feedback-empty case exposes an accessible status region naming the state", async ({
      page,
    }) => {
      const scope = frame(page, "feedback-empty");
      await expect(scope.getByRole("status")).toBeVisible();
      await expect(scope.getByText(/no feedback submissions/i)).toBeVisible();
    });

    test("goals-empty case exposes an accessible status region naming the state", async ({
      page,
    }) => {
      const scope = frame(page, "goals-empty");
      await expect(scope.getByRole("status")).toBeVisible();
      await expect(scope.getByText(/no goals yet/i)).toBeVisible();
    });

    test("roadmap-empty case exposes an accessible status region naming the state", async ({
      page,
    }) => {
      const scope = frame(page, "roadmap-empty");
      await expect(scope.getByRole("status")).toBeVisible();
      await expect(scope.getByText(/no roadmap items yet/i)).toBeVisible();
    });
  });

  test.describe("reduced motion — the loading skeleton shimmer stops", () => {
    test.describe("with reduce requested", () => {
      test.use({ contextOptions: { reducedMotion: "reduce" } });

      test("the DataTableSkeleton computes animation-name none on the visible shimmer", async ({
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
});
