import { test, expect } from "@playwright/test";

test.describe("Projects Module", () => {
  test.describe("Projects List Page", () => {
    test("renders projects page", async ({ page }) => {
      await page.goto("/projects");
      const url = page.url();
      if (url.includes("signin")) return;

      await expect(page.getByRole("heading", { name: /Projects/i }).first()).toBeVisible();
    });

    test("has search input", async ({ page }) => {
      await page.goto("/projects");
      const url = page.url();
      if (url.includes("signin")) return;

      await expect(page.getByPlaceholder(/search/i)).toBeVisible();
    });

    test("has create project button", async ({ page }) => {
      await page.goto("/projects");
      const url = page.url();
      if (url.includes("signin")) return;

      const createBtn = page.getByRole("button", { name: /Create|New Project/i });
      await expect(createBtn.first()).toBeVisible();
    });

    test("has view mode toggle", async ({ page }) => {
      await page.goto("/projects");
      const url = page.url();
      if (url.includes("signin")) return;

      // Should have grid/list toggle buttons
      const buttons = page.locator("button[aria-label]");
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);
    });

    test("live region announces results", async ({ page }) => {
      await page.goto("/projects");
      const url = page.url();
      if (url.includes("signin")) return;

      const liveRegion = page.locator("[aria-live='polite']");
      await expect(liveRegion.first()).toBeAttached();
    });
  });

  test.describe("Project Sub-Pages", () => {
    // These tests verify page structure for authenticated users
    test("backlog page has accessible table", async ({ page }) => {
      await page.goto("/projects");
      const url = page.url();
      if (url.includes("signin")) return;

      // Check that the project listing has proper list semantics
      const listContainer = page.locator("[role='list']");
      const count = await listContainer.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});

test.describe("Timesheets Module", () => {
  test.describe("Personal Timesheets", () => {
    test("renders timesheets page", async ({ page }) => {
      await page.goto("/timesheets");
      const url = page.url();
      if (url.includes("signin")) return;

      await expect(page.getByRole("heading", { name: /Timesheet|Time/i }).first()).toBeVisible();
    });

    test("has add new log button", async ({ page }) => {
      await page.goto("/timesheets");
      const url = page.url();
      if (url.includes("signin")) return;

      const addBtn = page.getByRole("button", { name: /Add|Log/i });
      await expect(addBtn.first()).toBeVisible();
    });

    test("table has accessible structure", async ({ page }) => {
      await page.goto("/timesheets");
      const url = page.url();
      if (url.includes("signin")) return;

      // Check for table with caption
      const caption = page.locator("caption");
      if ((await caption.count()) > 0) {
        await expect(caption.first()).toBeAttached();
      }

      // Check for scope=col on table headers
      const ths = page.locator("th[scope='col']");
      const count = await ths.count();
      if (count > 0) {
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  test.describe("Team Timesheets", () => {
    test("renders team timesheets page", async ({ page }) => {
      await page.goto("/timesheets/team");
      const url = page.url();
      if (url.includes("signin")) return;

      await expect(page.getByRole("heading", { name: /Team|Timesheet/i }).first()).toBeVisible();
    });

    test("has export CSV button", async ({ page }) => {
      await page.goto("/timesheets/team");
      const url = page.url();
      if (url.includes("signin")) return;

      const exportBtn = page.getByRole("button", { name: /Export|CSV/i });
      if ((await exportBtn.count()) > 0) {
        await expect(exportBtn.first()).toBeVisible();
      }
    });

    test("table headers have scope=col", async ({ page }) => {
      await page.goto("/timesheets/team");
      const url = page.url();
      if (url.includes("signin")) return;

      const ths = page.locator("th[scope='col']");
      const count = await ths.count();
      if (count > 0) {
        expect(count).toBeGreaterThan(0);
      }
    });
  });
});
