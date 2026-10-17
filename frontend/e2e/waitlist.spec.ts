import { expect, test } from "@playwright/test";

test("joins the waitlist and shows the success panel", async ({ page }) => {
  await page.route("**/public/waitlist", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { ok: true } }),
    });
  });

  await page.goto("/waitlist");
  await expect(page).toHaveTitle("Join the waitlist | StreamlineOS");
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Work email").fill("ada@analytical.engine");
  await page.getByLabel("Company name").fill("Analytical Engines");
  await page.getByRole("radio", { name: "11-50" }).check();
  await page.getByRole("checkbox", { name: /agree to be contacted/i }).check();
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(page.getByRole("heading", { name: /you're on the list/i })).toBeVisible();
});
