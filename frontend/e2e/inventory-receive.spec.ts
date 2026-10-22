import { expect, test as base, type TestDetails } from "@playwright/test";
import { apiOracle, type ApiOracle } from "./fixtures/api-oracle";
import { describeLedger, movementFor, onHandFor, recentLedger } from "./fixtures/api-stock";
import { chooseFromComboboxBy } from "./fixtures/combobox";
import {
  seedTarget,
  sentPurchaseOrder,
  type PurchaseOrderRow,
  type SeedTarget,
} from "./fixtures/documents-receiving";
import { signIn } from "./fixtures/session";
import { SKIP_REASON, hasTenantEnv, tenantEnv } from "./fixtures/tenant";


const RECEIVE_QTY = 5;

interface ReceiveRequest {
  locationId: number;
  receivedDate: string;
  lines: Array<{ poLineId: number; quantityReceived: string; qualityStatus: string }>;
}

const test = base.extend<
  { signedIn: void },
  { api: ApiOracle; seeded: { target: SeedTarget; po: PurchaseOrderRow } }
>({
  api: [
    async ({}, use) => {
      const api = await apiOracle();
      await use(api);
      await api.dispose();
    },
    { scope: "worker" },
  ],
  seeded: [
    async ({ api }, use) => {
      const target = await seedTarget(api, RECEIVE_QTY);
      const po = await sentPurchaseOrder(api, target, RECEIVE_QTY, "INV-21 receive leg");
      await use({ target, po });
    },
    { scope: "worker", auto: true, timeout: 300_000 },
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

describeWithTenant("inventory · receive against a purchase order", TENANT_DETAILS, () => {
  test.describe.configure({ timeout: 180_000 });

  test("counting a delivery in posts it to stock, and the ledger agrees", async ({
    page,
    api,
    seeded,
  }) => {
    const { target, po } = seeded;
    const poLineId = po.lines[0]!.id;

    await page.goto(`/inventory/purchase-orders/${po.id}`);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(po.poNumber, {
      timeout: 30_000,
    });

    await page.getByRole("button", { name: "Receive goods" }).click();

    const sheet = page.getByRole("dialog", { name: "Receive Goods" });
    await expect(sheet).toBeVisible();

    await chooseFromComboboxBy(
      sheet,
      "Receive at Location",
      `Code: ${target.bin.code}`,
      target.bin.name,
    );

    await sheet.getByLabel("Qty received").fill(String(RECEIVE_QTY));

    await expect(sheet.getByLabel("Accepted")).toBeChecked();

    const request = page.waitForRequest(
      (req) =>
        req.url().includes(`/inventory/purchase-orders/${po.id}/receive`) &&
        req.method() === "POST",
    );
    const response = page.waitForResponse(
      (res) =>
        res.url().includes(`/inventory/purchase-orders/${po.id}/receive`) &&
        res.request().method() === "POST",
    );

    await sheet.getByRole("button", { name: "Post to stock" }).click();

    const sent = (await request).postDataJSON() as ReceiveRequest;
    const posted = await response;
    expect(posted.status(), await posted.text()).toBeLessThan(300);

    expect(sent.locationId).toBe(target.bin.id);
    expect(sent.lines?.[0]?.poLineId).toBe(poLineId);
    expect(Number(sent.lines?.[0]?.quantityReceived)).toBe(RECEIVE_QTY);
    expect(sent.lines?.[0]?.qualityStatus).toBe("ACCEPTED");

    const body = (await posted.json()) as {
      data?: { id?: number; grnNumber?: string; status?: string };
      id?: number;
      grnNumber?: string;
      status?: string;
    };
    const grnId = body.data?.id ?? body.id;
    const grnNumber = body.data?.grnNumber ?? body.grnNumber;
    expect(grnId, "the receive response carried no goods-receipt id").toBeTruthy();

    expect(
      body.data?.status ?? body.status,
      "the one-shot receive path used to leave the receipt in DRAFT while moving its stock; " +
        "if this now reads POSTED the backend defect is fixed and this assertion should become POSTED",
    ).toBe("DRAFT");

    await expect(page.getByText(`GRN ${grnNumber} posted to stock`)).toBeVisible({
      timeout: 20_000,
    });

    await expect(async () => {
      const ledger = await recentLedger(api, target.variantId, 25);
      const entry = movementFor(ledger, {
        referenceType: "inv_grn",
        referenceId: grnId!,
        locationId: target.bin.id,
        transactionType: "GRN",
      });

      expect(
        entry,
        `no GRN movement for receipt ${grnId} at bin ${target.bin.id} (${target.bin.code}); ` +
          `rows were ${describeLedger(ledger)}`,
      ).toBeTruthy();

      expect(Number(entry!.quantityChange)).toBe(RECEIVE_QTY);
      expect(Number(entry!.quantityAfter)).toBe(Number(entry!.quantityBefore) + RECEIVE_QTY);

      expect(await onHandFor(api, target.variantId, target.bin.id)).toBe(
        Number(entry!.quantityAfter),
      );
    }).toPass({ timeout: 30_000 });

    await expect(async () => {
      const after = await api.get<{ status: string }>(`/inventory/purchase-orders/${po.id}`);
      expect(after.status).toBe("RECEIVED");
    }).toPass({ timeout: 20_000 });

    await page.goto("/inventory/operations/receipts");
    await expect(page.getByRole("table")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("cell", { name: grnNumber! })).toBeVisible({ timeout: 20_000 });
  });
});
