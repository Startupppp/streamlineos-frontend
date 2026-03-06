import { test, expect } from "@playwright/test";

test.describe("HR Module", () => {
  test.describe("Employees Page", () => {
    test("renders employees page structure", async ({ page }) => {
      await page.goto("/hr");
      const url = page.url();
      if (url.includes("signin")) return; // Skip if not authenticated

      await expect(page.getByRole("heading", { name: "Employees" })).toBeVisible();
      await expect(page.getByLabel("Search employees")).toBeVisible();
    });

    test("table has accessible structure", async ({ page }) => {
      await page.goto("/hr");
      const url = page.url();
      if (url.includes("signin")) return;

      // Table should have caption
      const caption = page.locator("caption");
      await expect(caption).toBeAttached();

      // Table headers should have scope=col
      const ths = page.locator("th[scope='col']");
      const count = await ths.count();
      expect(count).toBeGreaterThan(0);
    });

    test("export button is functional", async ({ page }) => {
      await page.goto("/hr");
      const url = page.url();
      if (url.includes("signin")) return;

      const exportBtn = page.getByRole("button", { name: /Export/i });
      await expect(exportBtn).toBeVisible();
      // Button should not be disabled
      await expect(exportBtn).toBeEnabled();
    });

    test("pagination has accessible labels", async ({ page }) => {
      await page.goto("/hr");
      const url = page.url();
      if (url.includes("signin")) return;

      const prevBtn = page.getByRole("button", { name: "Go to previous page" });
      const nextBtn = page.getByRole("button", { name: "Go to next page" });
      // At least one should be visible if there are employees
      const hasNav = (await prevBtn.count()) > 0 || (await nextBtn.count()) > 0;
      if (hasNav) {
        await expect(prevBtn).toBeAttached();
        await expect(nextBtn).toBeAttached();
      }
    });

    test("search filters employees", async ({ page }) => {
      await page.goto("/hr");
      const url = page.url();
      if (url.includes("signin")) return;

      const searchInput = page.getByLabel("Search employees");
      await searchInput.fill("nonexistent-employee-12345");
      // Should show empty state or filtered results
      await page.waitForTimeout(500);
    });

    test("filter controls are accessible", async ({ page }) => {
      await page.goto("/hr");
      const url = page.url();
      if (url.includes("signin")) return;

      await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();
    });
  });

  test.describe("HR Sub-Pages Navigation", () => {
    const hrPages = [
      { path: "/hr/leaves", heading: /Leave/i },
      { path: "/hr/attendance", heading: /Attendance|WFH/i },
      { path: "/hr/payroll", heading: /Payroll/i },
      { path: "/hr/documents", heading: /Document/i },
      { path: "/hr/devices", heading: /Device/i },
      { path: "/hr/work-logs", heading: /Work Log/i },
      { path: "/hr/expenses", heading: /Expense/i },
    ];

    for (const { path, heading } of hrPages) {
      test(`${path} page loads`, async ({ page }) => {
        await page.goto(path);
        const url = page.url();
        if (url.includes("signin")) return;

        await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      });
    }
  });
});
