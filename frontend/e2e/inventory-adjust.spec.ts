import { expect, test as base, type TestDetails } from "@playwright/test";
import { apiOracle, type ApiOracle } from "./fixtures/api-oracle";
import { findLocationWithHeadroom, onHandFor, recentLedger } from "./fixtures/api-stock";
import { chooseFirstOption, chooseFromCombobox } from "./fixtures/combobox";
import { signIn } from "./fixtures/session";
import { SKIP_REASON, hasTenantEnv, tenantEnv } from "./fixtures/tenant";


const ADJUST_QTY = 7;

interface AdjustmentRequest {
  reason: string;
  lines: Array<{
    productVariantId: number;
    locationId: number;
    quantityChange: number;
  }>;
}

const test = base.extend<{ signedIn: void }, { api: ApiOracle }>({
  api: [
    async ({}, use) => {
      const api = await apiOracle();
      await use(api);
      await api.dispose();
    },
    { scope: "worker" },
  ],
  signedIn: [
    async ({ context, baseURL }, use) => {
      if (!baseURL)
        throw new Error(
          "No baseURL. The session cookie is scoped to its hostname, so it cannot be minted without one.",
        );
      await signIn(context, tenantEnv().user, baseURL);
      await use();
    },
    { auto: true },
  ],
});

const HAS_TENANT = hasTenantEnv();

const describeWithTenant: (title: string, details: TestDetails, callback: () => void) => void =
  HAS_TENANT ? test.describe : test.describe.skip;

const TENANT_DETAILS: TestDetails = HAS_TENANT
  ? {}
  : { annotation: { type: "skip", description: SKIP_REASON } };

describeWithTenant("inventory · adjust", TENANT_DETAILS, () => {
  test("an adjustment moves on-hand by the quantity entered, and the ledger agrees", async ({
    page,
    api,
  }) => {
    const target = await findLocationWithHeadroom(api, ADJUST_QTY);

    await page.goto("/inventory/stock/adjustments");

    await page.getByRole("button", { name: /New Adjustment/i }).first().click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText("New Stock Adjustment")).toBeVisible();

    await chooseFromCombobox(sheet, "Warehouse", target.warehouseName);
    await chooseFromCombobox(sheet, "Location", target.locationName);
    await chooseFirstOption(sheet, "Product Variant");

    await sheet.getByLabel(/Quantity/).fill(String(ADJUST_QTY));

    await expect(sheet.getByRole("combobox", { name: "Direction *" })).toContainText(
      "In (Add stock)",
    );

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes("/inventory/stock/adjustments") && req.method() === "POST",
    );
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/inventory/stock/adjustments") && res.request().method() === "POST",
    );

    await sheet.getByRole("button", { name: "Create Adjustment" }).click();

    const sent = (await requestPromise).postDataJSON() as AdjustmentRequest;
    const response = await responsePromise;

    expect(response.status(), await response.text()).toBeLessThan(300);

    const line = sent.lines?.[0];
    expect(line, `the request carried no lines: ${JSON.stringify(sent)}`).toBeTruthy();

    expect(line?.quantityChange).toBe(ADJUST_QTY);

    expect(line?.locationId).toBe(target.locationId);

    await expect(page.getByText(/Adjustment created/i)).toBeVisible({ timeout: 20_000 });
    await expect(sheet).toBeHidden();

    const body = (await response.json()) as {
      data?: { status?: string; referenceNumber?: string };
      status?: string;
      referenceNumber?: string;
    };
    const status = body.data?.status ?? body.status;
    expect(status, "an approval-gated adjustment posts nothing; this leg needs the direct-post path").toBe("POSTED");

    await expect(async () => {
      const ledger = await recentLedger(api, line.productVariantId, 10);
      const entry = ledger.find(
        (row) =>
          row.locationId === line.locationId &&
          row.transactionType === "ADJUSTMENT_IN" &&
          Number(row.quantityChange) === ADJUST_QTY,
      );

      expect(
        entry,
        `no ADJUSTMENT_IN of ${ADJUST_QTY} at location ${line.locationId}; newest rows were ` +
          JSON.stringify(ledger.map((r) => [r.transactionType, r.quantityChange])),
      ).toBeTruthy();

      const before = Number(entry?.quantityBefore);
      const after = Number(entry?.quantityAfter);
      expect(after).toBe(before + ADJUST_QTY);

      const projected = await onHandFor(api, line.productVariantId, line.locationId);
      expect(projected).toBe(after);
    }).toPass({ timeout: 25_000 });

    const reference = (body.data?.referenceNumber ?? body.referenceNumber) as string;
    expect(reference, "the create response carried no reference number").toBeTruthy();

    await page.goto("/inventory/stock/adjustments");
    await expect(page.getByRole("table")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("cell", { name: reference })).toBeVisible({
      timeout: 20_000,
    });
  });
});
