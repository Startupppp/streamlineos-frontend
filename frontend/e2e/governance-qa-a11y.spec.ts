import { expect, test, type Locator, type Page } from "@playwright/test";
import { RISK_TABLE_HEADERS } from "../features/build/governance/risks-table-headers";
import { TEST_CASE_TABLE_HEADERS } from "../features/build/qa/test-case-headers";
import { INCIDENTS_TABLE_HEADERS } from "../features/build/incidents/incidents-table-headers";
import { DECISION_TABLE_HEADERS } from "../features/build/governance/decisions-table-headers";
import { APPROVALS_TABLE_HEADERS } from "../features/build/approvals/approvals-table-headers";

const GALLERY = "/design-system/governance-qa";
const EVIDENCE_DIR = "test-results/governance-qa-evidence";

const VIEWPORTS = [
  { name: "375x812", width: 375, height: 812 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1280x800", width: 1280, height: 800 },
] as const;

const CASES = [
  "governance-risks",
  "qa-test-cases",
  "incidents",
  "decisions",
  "approvals",
  "risks-with-selection",
  "loading-governance",
  "loading-qa",
  "loading-incidents",
  "loading-decisions",
  "loading-approvals",
  "empty-governance",
  "error-governance",
] as const;

function frame(page: Page, caseId: string): Locator {
  return page.locator(`[data-case-frame="${caseId}"]`);
}

async function horizontalOverflowOf(locator: Locator): Promise<number> {
  return locator.evaluate(
    (node: HTMLElement) => node.scrollWidth - node.clientWidth,
  );
}

test.describe("Governance & QA responsive contract", () => {
  for (const viewport of VIEWPORTS) {
    test.describe(viewport.name, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(GALLERY);
        await expect(
          page.getByRole("heading", { name: "Governance & QA surfaces" }),
        ).toBeVisible();
      });

      test("the page itself never scrolls sideways", async ({ page }) => {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
      });

      test("no list surface overflows its own width", async ({ page }, testInfo) => {
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
        const scope = frame(page, "governance-risks");
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
    });
  }

  test.describe("accessibility — ARIA structure", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Governance & QA surfaces" }),
      ).toBeVisible();
    });

    test("the risks table exposes a table role with labelled column headers", async ({ page }) => {
      const scope = frame(page, "governance-risks");
      const table = scope.getByRole("table");
      await expect(table).toBeVisible();
      await expect(
        scope.getByRole("columnheader", { name: "Title", exact: true }),
      ).toBeVisible();
      await expect(
        scope.getByRole("columnheader", { name: "Status", exact: true }),
      ).toBeVisible();
    });

    test("the QA table exposes a table role with the column headers the real test-case table defines", async ({ page }) => {
      const scope = frame(page, "qa-test-cases");
      const table = scope.getByRole("table");
      await expect(table).toBeVisible();
      await expect(
        scope.getByRole("columnheader", { name: "Priority", exact: true }),
      ).toBeVisible();
      await expect(
        scope.getByRole("columnheader", { name: "Automation", exact: true }),
      ).toBeVisible();
    });

    test("the incidents table exposes a table role with the correct column headers", async ({ page }) => {
      const scope = frame(page, "incidents");
      const table = scope.getByRole("table");
      await expect(table).toBeVisible();
      await expect(scope.getByRole("columnheader", { name: "Severity", exact: true })).toBeVisible();
      await expect(scope.getByRole("columnheader", { name: "SLA", exact: true })).toBeVisible();
    });

    test("the decisions table exposes a table role with the correct column headers", async ({ page }) => {
      const scope = frame(page, "decisions");
      const table = scope.getByRole("table");
      await expect(table).toBeVisible();
      await expect(scope.getByRole("columnheader", { name: "Status", exact: true })).toBeVisible();
      await expect(scope.getByRole("columnheader", { name: "Decided", exact: true })).toBeVisible();
    });

    test("the approvals table exposes a table role with the correct column headers", async ({ page }) => {
      const scope = frame(page, "approvals");
      const table = scope.getByRole("table");
      await expect(table).toBeVisible();
      await expect(scope.getByRole("columnheader", { name: "Type", exact: true })).toBeVisible();
      await expect(scope.getByRole("columnheader", { name: "Approver", exact: true })).toBeVisible();
    });

    test("the loading-incidents skeleton announces the same headers as INCIDENTS_TABLE_HEADERS", async ({ page }) => {
      const scope = frame(page, "loading-incidents");
      for (const header of INCIDENTS_TABLE_HEADERS) {
        await expect(scope.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
      }
    });

    test("the loading-decisions skeleton announces the same headers as DECISION_TABLE_HEADERS", async ({ page }) => {
      const scope = frame(page, "loading-decisions");
      for (const header of DECISION_TABLE_HEADERS) {
        await expect(scope.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
      }
    });

    test("the loading-approvals skeleton announces the same headers as APPROVALS_TABLE_HEADERS", async ({ page }) => {
      const scope = frame(page, "loading-approvals");
      for (const header of APPROVALS_TABLE_HEADERS) {
        await expect(scope.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
      }
    });

    test("the loading skeleton announces the same governance columns as RISK_TABLE_HEADERS", async ({ page }) => {
      const scope = frame(page, "loading-governance");
      for (const header of RISK_TABLE_HEADERS) {
        await expect(scope.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
      }
    });

    test("the loading skeleton announces the same QA columns as TEST_CASE_TABLE_HEADERS", async ({ page }) => {
      const scope = frame(page, "loading-qa");
      for (const header of TEST_CASE_TABLE_HEADERS) {
        await expect(scope.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
      }
    });

    test("the empty state has a role=status landmark", async ({ page }) => {
      const scope = frame(page, "empty-governance");
      await expect(scope.getByRole("status")).toBeVisible();
      await expect(
        scope.getByRole("button", { name: "New Risk" }),
      ).toBeVisible();
    });
  });

  test.describe("keyboard reachability — 1280x800", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Governance & QA surfaces" }),
      ).toBeVisible();
    });

    test("search input is reachable by keyboard in the risks frame", async ({ page }) => {
      const scope = frame(page, "governance-risks");
      const searchInput = scope.locator("[data-slot=search-input] input");
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
    });

    test("search input is reachable by keyboard in the QA frame", async ({ page }) => {
      const scope = frame(page, "qa-test-cases");
      const searchInput = scope.locator("[data-slot=search-input] input");
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
    });

    test("table rows in the risks surface have the row ARIA role", async ({ page }) => {
      const scope = frame(page, "governance-risks");
      const rows = scope.getByRole("row");
      await expect(rows.first()).toBeVisible();
      await expect(rows).toHaveCount(9);
    });

    test("pagination controls are present in the risks surface", async ({ page }) => {
      const scope = frame(page, "governance-risks");
      const nextBtn = scope.getByRole("button", { name: /next/i });
      const prevBtn = scope.getByRole("button", { name: /prev/i });
      await expect(nextBtn.or(prevBtn)).not.toHaveCount(0);
    });

    test("the select-all checkbox in the selection case is keyboard reachable and checks on Space", async ({ page }) => {
      const scope = frame(page, "risks-with-selection");
      const checkbox = scope.getByRole("checkbox", {
        name: "Select all rows on this page",
        exact: true,
      });
      await checkbox.focus();
      await expect(checkbox).toBeFocused();
      await checkbox.press("Space");
      await expect(checkbox).toBeChecked();
    });

    test("the bulk action bar becomes visible once rows are selected, proving it is not always present", async ({ page }) => {
      const scope = frame(page, "risks-with-selection");
      const checkbox = scope.getByRole("checkbox", {
        name: "Select all rows on this page",
        exact: true,
      });
      const bulkBar = scope.getByRole("region", { name: "Bulk actions", exact: true });
      await expect(bulkBar).not.toBeVisible();
      await checkbox.press("Space");
      await expect(bulkBar).toBeVisible();
    });

    test("Escape clears the selection and hides the bulk action bar, proving the Escape handler in useBuildListKeyboard is wired", async ({ page }) => {
      const scope = frame(page, "risks-with-selection");
      const checkbox = scope.getByRole("checkbox", {
        name: "Select all rows on this page",
        exact: true,
      });
      await checkbox.press("Space");
      await expect(
        scope.getByRole("region", { name: "Bulk actions", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(
        scope.getByRole("region", { name: "Bulk actions", exact: true }),
      ).not.toBeVisible();
    });

    test("search input is reachable by keyboard in the incidents frame", async ({ page }) => {
      const scope = frame(page, "incidents");
      const searchInput = scope.locator("[data-slot=search-input] input");
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
    });

    test("search input is reachable by keyboard in the decisions frame", async ({ page }) => {
      const scope = frame(page, "decisions");
      const searchInput = scope.locator("[data-slot=search-input] input");
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
    });

    test("search input is reachable by keyboard in the approvals frame", async ({ page }) => {
      const scope = frame(page, "approvals");
      const searchInput = scope.locator("[data-slot=search-input] input");
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
    });

    test("table rows in the QA surface have the row ARIA role", async ({ page }) => {
      const scope = frame(page, "qa-test-cases");
      const rows = scope.getByRole("row");
      await expect(rows.first()).toBeVisible();
      await expect(rows).toHaveCount(9);
    });

    test("table rows in the incidents surface have the row ARIA role", async ({ page }) => {
      const scope = frame(page, "incidents");
      const rows = scope.getByRole("row");
      await expect(rows.first()).toBeVisible();
      await expect(rows).toHaveCount(9);
    });

    test("table rows in the decisions surface have the row ARIA role", async ({ page }) => {
      const scope = frame(page, "decisions");
      const rows = scope.getByRole("row");
      await expect(rows.first()).toBeVisible();
      await expect(rows).toHaveCount(9);
    });

    test("table rows in the approvals surface have the row ARIA role", async ({ page }) => {
      const scope = frame(page, "approvals");
      const rows = scope.getByRole("row");
      await expect(rows.first()).toBeVisible();
      await expect(rows).toHaveCount(9);
    });

    test("pagination controls are present in the QA surface", async ({ page }) => {
      const scope = frame(page, "qa-test-cases");
      const nextBtn = scope.getByRole("button", { name: /next/i });
      const prevBtn = scope.getByRole("button", { name: /prev/i });
      await expect(nextBtn.or(prevBtn)).not.toHaveCount(0);
    });

    test("pagination controls are present in the incidents surface", async ({ page }) => {
      const scope = frame(page, "incidents");
      const nextBtn = scope.getByRole("button", { name: /next/i });
      const prevBtn = scope.getByRole("button", { name: /prev/i });
      await expect(nextBtn.or(prevBtn)).not.toHaveCount(0);
    });

    test("pagination controls are present in the decisions surface", async ({ page }) => {
      const scope = frame(page, "decisions");
      const nextBtn = scope.getByRole("button", { name: /next/i });
      const prevBtn = scope.getByRole("button", { name: /prev/i });
      await expect(nextBtn.or(prevBtn)).not.toHaveCount(0);
    });

    test("pagination controls are present in the approvals surface", async ({ page }) => {
      const scope = frame(page, "approvals");
      const nextBtn = scope.getByRole("button", { name: /next/i });
      const prevBtn = scope.getByRole("button", { name: /prev/i });
      await expect(nextBtn.or(prevBtn)).not.toHaveCount(0);
    });
  });

  test.describe("reduced motion — the skeleton shimmer stops", () => {
    async function shimmerAnimationName(page: Page): Promise<string> {
      const shimmer = frame(page, "loading-governance")
        .locator(".skeleton-shimmer.animate-pulse:visible")
        .first();
      await expect(shimmer).toBeVisible();
      return shimmer.evaluate(
        (node: HTMLElement) => getComputedStyle(node).animationName,
      );
    }

    test.describe("with reduce requested", () => {
      test.use({ contextOptions: { reducedMotion: "reduce" } });

      test("the loading skeleton computes animation-name none", async ({ page }) => {
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

  test.describe("high-density desktop — 1920x1080 scale 2", () => {
    test.use({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });

    test.beforeEach(async ({ page }) => {
      await page.goto(GALLERY);
      await expect(
        page.getByRole("heading", { name: "Governance & QA surfaces" }),
      ).toBeVisible();
    });

    test("the page itself never scrolls sideways at scale 2", async ({ page }) => {
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

    test("the QA test-cases table rightmost column header is visible at scale 2", async ({ page }) => {
      const scope = frame(page, "qa-test-cases");
      await expect(
        scope.getByRole("columnheader", { name: "Actions", exact: true }),
      ).toBeVisible();
    });
  });

  test.describe("375x812 — mobile layout", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(GALLERY);
    });

    test("search input is visible and filters collapse to a drawer at 375px", async ({ page }) => {
      const scope = frame(page, "governance-risks");
      const search = scope.locator("[data-slot=search-input]");
      const searchBox = await search.boundingBox();
      expect(searchBox).not.toBeNull();
      expect((searchBox?.height ?? 0)).toBeGreaterThan(0);
      const individualFilter = scope.locator("[data-filter-id=status]");
      const filterBox = await individualFilter.boundingBox();
      expect(filterBox).toBeNull();
    });

    test("the risks list shows mobile cards not a desktop table", async ({ page }) => {
      const scope = frame(page, "governance-risks");
      await expect(scope.locator("table")).toBeHidden();
    });

    test("the QA list shows mobile cards not a desktop table", async ({ page }) => {
      const scope = frame(page, "qa-test-cases");
      await expect(scope.locator("table")).toBeHidden();
    });

    test("the incidents list shows mobile cards not a desktop table", async ({ page }) => {
      const scope = frame(page, "incidents");
      await expect(scope.locator("table")).toBeHidden();
    });

    test("the decisions list shows mobile cards not a desktop table", async ({ page }) => {
      const scope = frame(page, "decisions");
      await expect(scope.locator("table")).toBeHidden();
    });
  });
});
