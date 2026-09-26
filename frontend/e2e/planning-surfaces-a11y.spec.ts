import { expect, test, type Locator, type Page } from "@playwright/test";

const GALLERY = "/design-system/planning-surfaces";
const EVIDENCE_DIR = "test-results/planning-surfaces-evidence";

async function shimmerAnimationName(page: Page): Promise<string> {
  const shimmer = page
    .locator('[data-case-frame="releases-loading"]')
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
  "milestones-ready",
  "milestones-empty-true",
  "milestones-empty-filtered",
  "milestones-error",
  "milestones-denied",
  "releases-ready",
  "releases-loading",
  "releases-empty-true",
  "releases-empty-filtered",
  "releases-error",
  "releases-denied",
  "goals-ready",
  "goals-loading",
  "goals-empty-true",
  "goals-empty-filtered",
  "goals-error",
  "goals-denied",
  "goal-detail-skeleton",
  "goal-detail-ready",
  "portfolios-ready",
  "portfolios-loading",
  "portfolios-empty-true",
  "portfolios-error",
  "portfolios-denied",
  "portfolio-detail-ready",
  "programs-ready",
  "programs-loading",
  "programs-empty-true",
  "programs-error",
  "programs-denied",
  "roadmap-ready",
  "roadmap-empty-true",
  "roadmap-error",
  "roadmap-denied",
] as const;

function frame(page: Page, caseId: string): Locator {
  return page.locator(`[data-case-frame="${caseId}"]`);
}

async function horizontalOverflowOf(locator: Locator): Promise<number> {
  return locator.evaluate(
    (node: HTMLElement) => node.scrollWidth - node.clientWidth,
  );
}

test.describe("Planning surfaces responsive contract", () => {
  for (const viewport of VIEWPORTS) {
    test.describe(viewport.name, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(GALLERY);
        await expect(
          page.getByRole("heading", { name: "Planning surfaces" }),
        ).toBeVisible();
      });

      test("the page itself never scrolls sideways", async ({ page }) => {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
      });

      test("no planning surface overflows its own width", async ({ page }, testInfo) => {
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

      test("milestones denied shows access-restricted text, never milestone list", async ({
        page,
      }) => {
        const scope = frame(page, "milestones-denied");
        await expect(scope.getByText(/access restricted/i)).toBeVisible();
        await expect(scope.getByText(/no milestones yet/i)).not.toBeVisible();
      });

      test("releases denied shows access-restricted text, never release list", async ({
        page,
      }) => {
        const scope = frame(page, "releases-denied");
        await expect(scope.getByText(/access restricted/i)).toBeVisible();
        await expect(scope.getByText(/no releases yet/i)).not.toBeVisible();
      });

      test("milestones error shows failure message, not blank", async ({ page }) => {
        const scope = frame(page, "milestones-error");
        await expect(scope.getByText(/couldn.*t load milestones/i)).toBeVisible();
      });

      test("releases error shows failure message, not blank", async ({ page }) => {
        const scope = frame(page, "releases-error");
        await expect(scope.getByText(/could not load your releases/i)).toBeVisible();
      });

      test("milestones ready mounts real milestone cards", async ({ page }) => {
        const scope = frame(page, "milestones-ready");
        await expect(scope.getByRole("list", { name: "Project milestones" })).toBeVisible();
        await expect(scope.getByText("Alpha launch")).toBeVisible();
        await expect(scope.getByText("Beta rollout")).toBeVisible();
      });

      test("milestones stat cards render all four labels, scoped to the stat grid so a status badge of the same word cannot satisfy the assertion", async ({
        page,
      }) => {
        const stats = frame(page, "milestones-ready").locator(
          '[data-slot="stat-card-grid"]',
        );
        for (const label of ["This page", "Achieved", "Pending", "Overdue"]) {
          await expect(stats.getByText(label)).toBeVisible();
        }
      });
    });
  }

  test.describe("375 x 812", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(GALLERY);
    });

    test("milestones and releases search is always visible", async ({ page }) => {
      for (const caseId of ["milestones-ready", "releases-ready"] as const) {
        const scope = frame(page, caseId);
        await expect(scope.locator("[data-slot=search-input]")).toBeVisible();
      }
    });

    test("filters collapse into a drawer trigger at mobile width", async ({ page }) => {
      for (const caseId of ["milestones-ready", "releases-ready"] as const) {
        const scope = frame(page, caseId);
        await expect(scope.getByRole("button", { name: /^Filters/ })).toBeVisible();
        await expect(scope.locator("[data-filter-id=status]")).toBeHidden();
        await expect(scope.locator("[data-filter-id=date-range]")).toBeHidden();
      }
    });

    test("milestone true-empty state fills body and shows an illustration", async ({ page }) => {
      const scope = frame(page, "milestones-empty-true");
      const status = scope.getByRole("status");
      const statusBox = await status.boundingBox();
      const frameBox = await scope.boundingBox();
      expect((statusBox?.height ?? 0) / (frameBox?.height ?? 1)).toBeGreaterThan(0.4);
      const illustration = scope.locator("img").first();
      const illustrationBox = await illustration.boundingBox();
      expect(illustrationBox?.width ?? 0).toBeGreaterThanOrEqual(80);
    });

    test("filtered milestone empty offers Clear filters, true empty offers Add Milestone", async ({
      page,
    }) => {
      const filtered = frame(page, "milestones-empty-filtered").getByRole("status");
      await expect(
        filtered.getByRole("button", { name: "Clear filters" }),
      ).toBeVisible();

      const trueEmpty = frame(page, "milestones-empty-true").getByRole("status");
      await expect(
        trueEmpty.getByRole("button", { name: "Add Milestone" }),
      ).toBeVisible();
    });

    test("filtered release empty offers Clear filters, true empty offers New Release", async ({
      page,
    }) => {
      const filtered = frame(page, "releases-empty-filtered").getByRole("status");
      await expect(
        filtered.getByRole("button", { name: "Clear filters" }),
      ).toBeVisible();

      const trueEmpty = frame(page, "releases-empty-true").getByRole("status");
      await expect(
        trueEmpty.getByRole("button", { name: "New Release" }),
      ).toBeVisible();
    });
  });

  test.describe("768 x 1024", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(GALLERY);
    });

    test("status and date-range filters appear inline and drawer trigger is gone", async ({
      page,
    }) => {
      for (const caseId of ["milestones-ready", "releases-ready"] as const) {
        const scope = frame(page, caseId);
        await expect(scope.locator("[data-filter-id=status]")).toBeVisible();
        await expect(scope.locator("[data-filter-id=date-range]")).toBeVisible();
        await expect(scope.getByRole("button", { name: /^Filters/ })).toBeHidden();
      }
    });

    test("releases table renders column headers", async ({ page }) => {
      const scope = frame(page, "releases-ready");
      await expect(scope.locator("table").first()).toBeVisible();
      for (const header of ["Name", "Status", "Release Date", "Tickets"]) {
        await expect(scope.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
      }
    });

    test("releases loading skeleton announces real column names", async ({ page }) => {
      const scope = frame(page, "releases-loading");
      for (const header of ["Name", "Status", "Release Date", "Tickets"]) {
        await expect(scope.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
      }
    });
  });

  test.describe("1280 x 800", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
    });

    test("release names are not clipped at viewport width", async ({ page }) => {
      const scope = frame(page, "releases-ready");
      await expect(scope.locator("table").first()).toBeVisible();
      const firstCell = scope.locator("table tbody tr:first-child td:first-child");
      await expect(firstCell).toBeVisible();
      const box = await firstCell.boundingBox();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(1280);
    });

    test("header actions sit to the right of the title", async ({ page }) => {
      const scope = frame(page, "milestones-ready");
      const title = await scope.getByRole("heading", { name: "Milestones" }).boundingBox();
      const actions = await scope.locator("[data-slot=build-header-actions]").boundingBox();
      expect(actions?.x ?? 0).toBeGreaterThan(title?.x ?? 0);
    });
  });

  test.describe("reduced motion — loading skeleton shimmer stops", () => {
    test.describe("with reduce requested", () => {
      test.use({ contextOptions: { reducedMotion: "reduce" } });

      test("DataTableSkeleton computes animation-name none on the visible shimmer", async ({
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

  test.describe("high-density desktop — 1920 × 1080 at deviceScaleFactor 2", () => {
    test.use({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });

    test.beforeEach(async ({ page }) => {
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Planning surfaces" }),
      ).toBeVisible();
    });

    test("the page does not scroll sideways at 1920 × 1080 deviceScaleFactor 2", async ({
      page,
    }) => {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test("no planning surface overflows its own width at 1920 × 1080 deviceScaleFactor 2", async ({
      page,
    }, testInfo) => {
      const overflows: Record<string, number> = {};
      for (const caseId of CASES) {
        const scope = frame(page, caseId);
        overflows[caseId] = await horizontalOverflowOf(scope);
        const shot = `${EVIDENCE_DIR}/${caseId}__1920x1080-2x.png`;
        await scope.screenshot({ path: shot });
        await testInfo.attach(`${caseId}__1920x1080-2x`, {
          path: shot,
          contentType: "image/png",
        });
      }
      const spilling = Object.entries(overflows).filter(([, px]) => px > 1);
      expect(spilling).toEqual([]);
    });

    test("release names are not clipped at 1920 × 1080 deviceScaleFactor 2", async ({ page }) => {
      const scope = frame(page, "releases-ready");
      await expect(scope.locator("table").first()).toBeVisible();
      const firstCell = scope.locator("table tbody tr:first-child td:first-child");
      await expect(firstCell).toBeVisible();
      const box = await firstCell.boundingBox();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(1920);
    });
  });

  test.describe("screen-reader — roles and accessible names on all eight planning pages", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(page.getByRole("heading", { name: "Planning surfaces" })).toBeVisible();
    });

    test("milestones-ready exposes a labelled milestone list and four stat cards", async ({ page }) => {
      const scope = frame(page, "milestones-ready");
      await expect(scope.getByRole("list", { name: "Project milestones", exact: true })).toBeVisible();
      const stats = scope.locator('[data-slot="stat-card-grid"]');
      for (const label of ["This page", "Achieved", "Pending", "Overdue"]) {
        await expect(stats.getByText(label, { exact: true })).toBeVisible();
      }
    });

    test("releases-ready exposes a table with labelled column headers", async ({ page }) => {
      const scope = frame(page, "releases-ready");
      for (const header of ["Name", "Status", "Release Date", "Tickets"]) {
        await expect(scope.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
      }
    });

    test("goals-ready exposes GoalCard items and stat cards", async ({ page }) => {
      const scope = frame(page, "goals-ready");
      await expect(scope.getByText("Grow ARR to $5M")).toBeVisible();
      await expect(scope.getByText("Launch EU region")).toBeVisible();
      const stats = scope.locator('[data-slot="stat-card-grid"]');
      for (const label of ["Total Goals", "On Track", "At Risk", "Avg Progress"]) {
        await expect(stats.getByText(label, { exact: true })).toBeVisible();
      }
    });

    test("goal-detail-ready exposes a labelled key results list and Check in button for each result", async ({ page }) => {
      const scope = frame(page, "goal-detail-ready");
      await expect(scope.getByRole("list", { name: "Key results", exact: true })).toBeVisible();
      await expect(scope.getByText("Reach $5M ARR by Q4 2027")).toBeVisible();
      const checkInButtons = scope.getByRole("button", { name: "Check in", exact: true });
      await expect(checkInButtons.first()).toBeVisible();
    });

    test("portfolios-ready exposes a table with labelled column headers", async ({ page }) => {
      const scope = frame(page, "portfolios-ready");
      for (const header of ["Name", "Status", "Health"]) {
        await expect(scope.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
      }
    });

    test("portfolio-detail-ready exposes a labelled linked projects list", async ({ page }) => {
      const scope = frame(page, "portfolio-detail-ready");
      await expect(scope.getByRole("list", { name: "Linked projects", exact: true })).toBeVisible();
    });

    test("programs-ready exposes a table with labelled column headers", async ({ page }) => {
      const scope = frame(page, "programs-ready");
      for (const header of ["Name", "Status", "Health"]) {
        await expect(scope.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
      }
    });

    test("roadmap-ready exposes a labelled roadmap items list", async ({ page }) => {
      const scope = frame(page, "roadmap-ready");
      await expect(scope.getByRole("list", { name: "Roadmap items", exact: true })).toBeVisible();
      await expect(scope.getByText("Self-serve billing portal")).toBeVisible();
    });
  });

  test.describe("reduced motion — goals and portfolios skeleton shimmers also stop", () => {
    test.describe("with reduce requested", () => {
      test.use({ contextOptions: { reducedMotion: "reduce" } });

      test("goals-loading skeleton computes animation-name none on the visible shimmer", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(GALLERY);
        const shimmer = frame(page, "goals-loading")
          .locator(".skeleton-shimmer.animate-pulse:visible")
          .first();
        await expect(shimmer).toBeVisible();
        const animName = await shimmer.evaluate((node: HTMLElement) => getComputedStyle(node).animationName);
        expect(animName).toBe("none");
      });

      test("portfolios-loading skeleton computes animation-name none on the visible shimmer", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(GALLERY);
        const shimmer = frame(page, "portfolios-loading")
          .locator(".skeleton-shimmer.animate-pulse:visible")
          .first();
        await expect(shimmer).toBeVisible();
        const animName = await shimmer.evaluate((node: HTMLElement) => getComputedStyle(node).animationName);
        expect(animName).toBe("none");
      });
    });

    test.describe("with no preference", () => {
      test.use({ contextOptions: { reducedMotion: "no-preference" } });

      test("goals-loading skeleton does animate, proving the reduce assertion is not vacuous", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(GALLERY);
        const shimmer = frame(page, "goals-loading")
          .locator(".skeleton-shimmer.animate-pulse:visible")
          .first();
        await expect(shimmer).toBeVisible();
        const animName = await shimmer.evaluate((node: HTMLElement) => getComputedStyle(node).animationName);
        expect(animName).not.toBe("none");
      });
    });
  });

  test.describe("keyboard", () => {
    test.describe("at 1280 × 800 — tab order follows visual order through milestones toolbar", () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(GALLERY);
        await expect(
          page.getByRole("heading", { name: "Planning surfaces" }),
        ).toBeVisible();
      });

      test("Tab from header action reaches search then status filter then date-range filter", async ({
        page,
      }) => {
        const scope = frame(page, "milestones-ready");
        const newMilestone = scope
          .locator('[data-slot="build-header-actions"]')
          .getByRole("button", { name: "New Milestone", exact: true });
        await newMilestone.focus();
        await expect(newMilestone).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(
          scope.locator('[data-slot="search-input"] input[type="search"]'),
        ).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(
          scope
            .locator('[data-filter-id="status"]')
            .getByRole("combobox", { name: "Status", exact: true }),
        ).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(
          scope.locator('[data-filter-id="date-range"]').getByRole("button"),
        ).toBeFocused();
      });
    });

    test.describe("at 375 × 812 — filters drawer opens and closes with keyboard", () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto(GALLERY);
      });

      test("Filters drawer opens on Enter, drawer body receives focus, Escape closes and trigger regains focus", async ({
        page,
      }) => {
        const scope = frame(page, "milestones-ready");
        const trigger = scope.getByRole("button", { name: /^Filters/ });
        await trigger.focus();
        await expect(trigger).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(
          page.locator('[data-slot="drawer-content"]'),
        ).toBeVisible();
        await expect(
          page.locator('[data-slot="drawer-content"]:focus-within'),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).not.toBeVisible();
        await expect(trigger).toBeFocused();
      });
    });

    test.describe("at 1280 × 800 — goals toolbar tab order follows visual order", () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(GALLERY);
        await expect(page.getByRole("heading", { name: "Planning surfaces" })).toBeVisible();
      });

      test("Tab from New Goal reaches search then level filter then status filter", async ({ page }) => {
        const scope = frame(page, "goals-ready");
        const newGoal = scope
          .locator('[data-slot="build-header-actions"]')
          .getByRole("button", { name: "New Goal", exact: true });
        await newGoal.focus();
        await expect(newGoal).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(scope.locator('[data-slot="search-input"] input[type="search"]')).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(
          scope.locator('[data-filter-id="level"]').getByRole("combobox", { name: "Level", exact: true }),
        ).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(
          scope.locator('[data-filter-id="status"]').getByRole("combobox", { name: "Status", exact: true }),
        ).toBeFocused();
      });
    });

    test.describe("at 1280 × 800 — portfolios toolbar tab order follows visual order", () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(GALLERY);
        await expect(page.getByRole("heading", { name: "Planning surfaces" })).toBeVisible();
      });

      test("Tab from New portfolio reaches search then status filter then health filter", async ({ page }) => {
        const scope = frame(page, "portfolios-ready");
        const newPortfolio = scope
          .locator('[data-slot="build-header-actions"]')
          .getByRole("button", { name: "New portfolio", exact: true });
        await newPortfolio.focus();
        await expect(newPortfolio).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(scope.locator('[data-slot="search-input"] input[type="search"]')).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(
          scope.locator('[data-filter-id="status"]').getByRole("combobox", { name: "Status", exact: true }),
        ).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(
          scope.locator('[data-filter-id="health"]').getByRole("combobox", { name: "Health", exact: true }),
        ).toBeFocused();
      });
    });

    test.describe("at 1280 × 800 — programs toolbar tab order follows visual order", () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(GALLERY);
        await expect(page.getByRole("heading", { name: "Planning surfaces" })).toBeVisible();
      });

      test("Tab from New program reaches search then status filter", async ({ page }) => {
        const scope = frame(page, "programs-ready");
        const newProgram = scope
          .locator('[data-slot="build-header-actions"]')
          .getByRole("button", { name: "New program", exact: true });
        await newProgram.focus();
        await expect(newProgram).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(scope.locator('[data-slot="search-input"] input[type="search"]')).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(
          scope.locator('[data-filter-id="status"]').getByRole("combobox", { name: "Status", exact: true }),
        ).toBeFocused();
      });
    });

    test.describe("at 1280 × 800 — roadmap toolbar tab order follows visual order", () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(GALLERY);
        await expect(page.getByRole("heading", { name: "Planning surfaces" })).toBeVisible();
      });

      test("Tab from New Item reaches search input", async ({ page }) => {
        const scope = frame(page, "roadmap-ready");
        const newItem = scope
          .locator('[data-slot="build-header-actions"]')
          .getByRole("button", { name: "New Item", exact: true });
        await newItem.focus();
        await expect(newItem).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(scope.locator('[data-slot="search-input"] input[type="search"]')).toBeFocused();
      });
    });
  });
});
