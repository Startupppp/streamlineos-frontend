import { expect, test as base, type Locator, type Page, type TestDetails } from "@playwright/test";
import { apiOracle, type ApiOracle } from "./fixtures/api-oracle";
import {
  describeLedger,
  movementFor,
  onHandFor,
  recentLedger,
  type LedgerEntry,
  type WarehouseLocation,
} from "./fixtures/api-stock";
import {
  binsWithHeadroom,
  postedReceipt,
  seedTarget,
  sentPurchaseOrder,
  type SeedTarget,
} from "./fixtures/documents-receiving";
import { signIn } from "./fixtures/session";
import { SKIP_REASON, hasTenantEnv, tenantEnv } from "./fixtures/tenant";


const TRANSFER_QTY = 3;
const STOCKED_QTY = 6;

const PICKER = {
  fromWarehouse: 0,
  fromLocation: 1,
  toWarehouse: 2,
  toLocation: 3,
  variant: 4,
} as const;

async function choosePositional(
  sheet: Locator,
  index: number,
  optionText: string,
  triggerShows: string,
): Promise<void> {
  const control = sheet.getByRole("combobox").nth(index);
  await expect(control).toBeEnabled({ timeout: 20_000 });
  await control.click();

  const option = sheet.page().getByRole("option", { name: optionText });
  await expect(
    option,
    `"${optionText}" matched ${await option.count()} options; it must identify exactly one`,
  ).toHaveCount(1);
  await option.click();

  await expect(control).toContainText(triggerShows);
}

function transferMovements(
  ledger: LedgerEntry[],
  transferId: number,
  fromId: number,
  toId: number,
) {
  const of = (transactionType: string, locationId: number) =>
    movementFor(ledger, {
      referenceType: "inv_transfer",
      referenceId: transferId,
      locationId,
      transactionType,
    });
  return {
    offSource: of("TRANSFER_OUT", fromId),
    intoDestination: of("TRANSFER_IN", toId),
  };
}

const test = base.extend<
  { signedIn: void },
  { api: ApiOracle; seeded: { target: SeedTarget; destination: WarehouseLocation | undefined } }
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
      const target = await seedTarget(api, STOCKED_QTY);
      const po = await sentPurchaseOrder(api, target, STOCKED_QTY, "INV-21 transfer leg");
      await postedReceipt(api, po, target, STOCKED_QTY);
      const destination = (
        await binsWithHeadroom(api, target.warehouseId, TRANSFER_QTY, [target.bin.id])
      )[0];
      await use({ target, destination });
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

describeWithTenant("inventory · stock transfer", TENANT_DETAILS, () => {
  test.describe.configure({ timeout: 180_000 });

  test("a transfer walks the stock from one bin to another and the ledger follows", async ({
    page,
    api,
    seeded,
  }) => {
    const { target, destination } = seeded;
    expect(
      destination,
      `no second bin in warehouse ${target.warehouseId} can accept ${TRANSFER_QTY} units, ` +
        `so there is nowhere to transfer to`,
    ).toBeTruthy();

    const sourceBefore = await onHandFor(api, target.variantId, target.bin.id);
    const destinationBefore = await onHandFor(api, target.variantId, destination!.id);

    await page.goto("/inventory/stock/transfers");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Stock Transfers", {
      timeout: 30_000,
    });

    await page.getByRole("button", { name: "New Transfer" }).first().click();
    const sheet = page.getByRole("dialog", { name: "New Transfer" });
    await expect(sheet).toBeVisible();

    await choosePositional(
      sheet,
      PICKER.fromWarehouse,
      target.warehouseName,
      target.warehouseName,
    );
    await choosePositional(sheet, PICKER.fromLocation, target.bin.code, target.bin.name);
    await choosePositional(sheet, PICKER.toWarehouse, target.warehouseName, target.warehouseName);
    await choosePositional(sheet, PICKER.toLocation, destination!.code, destination!.name);
    await choosePositional(
      sheet,
      PICKER.variant,
      target.variantSku,
      target.variantProductName,
    );

    await sheet.getByPlaceholder("Qty").fill(String(TRANSFER_QTY));

    const createRequest = page.waitForRequest(
      (req) => req.url().endsWith("/inventory/stock/transfers") && req.method() === "POST",
    );
    const createResponse = page.waitForResponse(
      (res) =>
        res.url().endsWith("/inventory/stock/transfers") &&
        res.request().method() === "POST",
    );

    await sheet.getByRole("button", { name: "Create Transfer" }).click();

    const sent = (await createRequest).postDataJSON() as {
      fromLocationId: number;
      toLocationId: number;
      lines: Array<{ productVariantId: number; quantity: number }>;
    };
    const created = await createResponse;
    expect(created.status(), await created.text()).toBeLessThan(300);

    expect(sent.fromLocationId).toBe(target.bin.id);
    expect(sent.toLocationId).toBe(destination!.id);
    expect(sent.lines?.[0]?.productVariantId).toBe(target.variantId);
    expect(Number(sent.lines?.[0]?.quantity)).toBe(TRANSFER_QTY);

    const createdBody = (await created.json()) as {
      data?: { id?: number; referenceNumber?: string };
      id?: number;
      referenceNumber?: string;
    };
    const transferId = createdBody.data?.id ?? createdBody.id;
    const reference = createdBody.data?.referenceNumber ?? createdBody.referenceNumber;
    expect(transferId, "the create response carried no transfer id").toBeTruthy();

    await expect(page.getByText("Transfer created")).toBeVisible({ timeout: 20_000 });

    expect(await onHandFor(api, target.variantId, target.bin.id)).toBe(sourceBefore);

    await page.goto(`/inventory/stock/transfers/${transferId}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(reference!, {
      timeout: 30_000,
    });

    await clickAndAwait(page, "Reserve Transfer", `/inventory/stock/transfers/${transferId}/reserve`);
    await expect(page.getByText("Transfer reserved")).toBeVisible({ timeout: 20_000 });

    expect(await onHandFor(api, target.variantId, target.bin.id)).toBe(sourceBefore);

    await clickAndAwait(
      page,
      "Dispatch Transfer",
      `/inventory/stock/transfers/${transferId}/dispatch`,
    );
    await expect(page.getByText("Transfer dispatched")).toBeVisible({ timeout: 20_000 });

    let issue: LedgerEntry | undefined;
    await expect(async () => {
      const ledger = await recentLedger(api, target.variantId, 25);
      issue = transferMovements(ledger, transferId!, target.bin.id, destination!.id).offSource;
      expect(
        issue,
        `no TRANSFER_OUT for transfer ${transferId} at the source bin ${target.bin.id}; ` +
          `rows were ${describeLedger(ledger)}`,
      ).toBeTruthy();
      expect(Number(issue!.quantityChange)).toBe(-TRANSFER_QTY);
      expect(Number(issue!.quantityAfter)).toBe(Number(issue!.quantityBefore) - TRANSFER_QTY);

      expect(await onHandFor(api, target.variantId, target.bin.id)).toBe(
        Number(issue!.quantityAfter),
      );
      expect(
        await onHandFor(api, target.variantId, destination!.id),
        "the destination was credited on dispatch; the goods are counted in two places at once",
      ).toBe(destinationBefore);
    }).toPass({ timeout: 30_000 });

    await page.getByRole("button", { name: "Receive Transfer" }).click();
    const receiveSheet = page.getByRole("dialog", { name: "Receive Transfer" });
    await expect(receiveSheet).toBeVisible();

    const completeResponse = page.waitForResponse(
      (res) =>
        res.url().includes(`/inventory/stock/transfers/${transferId}/complete`) &&
        res.request().method() === "POST",
    );
    await receiveSheet.getByRole("button", { name: "Confirm Receipt" }).click();
    const completed = await completeResponse;
    expect(completed.status(), await completed.text()).toBeLessThan(300);

    await expect(page.getByText("Transfer completed")).toBeVisible({ timeout: 20_000 });

    await expect(async () => {
      const ledger = await recentLedger(api, target.variantId, 25);
      const arrival = transferMovements(
        ledger,
        transferId!,
        target.bin.id,
        destination!.id,
      ).intoDestination;

      expect(
        arrival,
        `no TRANSFER_IN for transfer ${transferId} at the destination bin ${destination!.id} ` +
          `(${destination!.code}); rows were ${describeLedger(ledger)}. A transfer that lands the ` +
          `goods in a different bin returns 200 and shows the same success toast.`,
      ).toBeTruthy();
      expect(Number(arrival!.quantityChange)).toBe(TRANSFER_QTY);
      expect(Number(arrival!.quantityAfter)).toBe(Number(arrival!.quantityBefore) + TRANSFER_QTY);

      expect(await onHandFor(api, target.variantId, destination!.id)).toBe(
        Number(arrival!.quantityAfter),
      );

      expect(await onHandFor(api, target.variantId, target.bin.id)).toBe(
        sourceBefore - TRANSFER_QTY,
      );
      expect(await onHandFor(api, target.variantId, destination!.id)).toBe(
        destinationBefore + TRANSFER_QTY,
      );
    }).toPass({ timeout: 30_000 });

    await expect(async () => {
      const after = await api.get<{ status: string }>(
        `/inventory/stock/transfers/${transferId}`,
      );
      expect(after.status).toBe("COMPLETED");
    }).toPass({ timeout: 20_000 });
  });
});

async function clickAndAwait(page: Page, button: string, path: string): Promise<void> {
  const response = page.waitForResponse(
    (res) => res.url().includes(path) && res.request().method() === "POST",
  );
  await page.getByRole("button", { name: button }).click();
  const settled = await response;
  expect(settled.status(), `${button} → ${await settled.text()}`).toBeLessThan(300);
}
