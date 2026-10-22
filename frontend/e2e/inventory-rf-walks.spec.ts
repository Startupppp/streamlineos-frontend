import { expect, test as base, type Page, type TestDetails } from "@playwright/test";
import { apiOracle, type ApiOracle } from "./fixtures/api-oracle";
import { reservationFor } from "./fixtures/api-reservations";
import { describeLedger, movementFor, onHandFor, recentLedger } from "./fixtures/api-stock";
import {
  claimedPickWave,
  claimedPutawayTask,
  type ClaimedPickWave,
  type ClaimedPutawayTask,
} from "./fixtures/documents-operations";
import {
  postedReceipt,
  seedTarget,
  sentPurchaseOrder,
  type SeedTarget,
} from "./fixtures/documents-receiving";
import { signIn } from "./fixtures/session";
import { SKIP_REASON, hasTenantEnv, tenantEnv } from "./fixtures/tenant";


const RF_VIEWPORT = { width: 375, height: 812 };

const PUTAWAY_QTY = 4;
const PICK_QTY = 2;

async function expectRunnerFor(page: Page, reference: string): Promise<void> {
  await expect(
    page.getByText(/don't have access to this screen/i),
    "rendered the permission wall instead of the task runner",
  ).toHaveCount(0);
  await expect(
    page.getByText(/Could not load this (task|wave)/i),
    "the runner failed to load its document",
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 1 }),
    "the runner is not showing this document",
  ).toHaveText(reference, { timeout: 30_000 });
}

async function confirmStep(page: Page, quantity: string): Promise<void> {
  const step = page.getByLabel(/^Quantity/);
  await expect(step, "the RF step never rendered its quantity field").toBeVisible({
    timeout: 30_000,
  });
  await step.fill(quantity);
  await page.getByRole("button", { name: "Confirm" }).click();
}

const test = base.extend<
  { signedIn: void },
  {
    api: ApiOracle;
    seeded: { target: SeedTarget; task: ClaimedPutawayTask; wave: ClaimedPickWave };
  }
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
      const target = await seedTarget(api, PUTAWAY_QTY);
      const po = await sentPurchaseOrder(api, target, PUTAWAY_QTY, "INV-20 putaway walk");
      const receipt = await postedReceipt(api, po, target, PUTAWAY_QTY);
      const task = await claimedPutawayTask(api, receipt.grnId);
      const wave = await claimedPickWave(api, target, PICK_QTY);
      await use({ target, task, wave });
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

test.use({ viewport: RF_VIEWPORT });

const HAS_TENANT = hasTenantEnv();

const describeWithTenant: (title: string, details: TestDetails, callback: () => void) => void =
  HAS_TENANT ? test.describe : test.describe.skip;

const TENANT_DETAILS: TestDetails = HAS_TENANT
  ? {}
  : { annotation: { type: "skip", description: SKIP_REASON } };

describeWithTenant("inventory · RF walks", TENANT_DETAILS, () => {
  test.describe.configure({ timeout: 180_000 });

  test("putting a receipt away moves the stock off the dock and onto the shelf", async ({
    page,
    api,
    seeded,
  }) => {
    const { target, task } = seeded;
    const destinationId = task.line.to_location_id ?? task.line.suggestions[0]?.locationId;
    const destinationCode = task.line.to_location_code ?? task.line.suggestions[0]?.code;
    expect(destinationId, "the seeded task has no destination bin").toBeTruthy();

    await page.goto(`/inventory/rf/putaway/${task.taskId}`);
    await expectRunnerFor(page, task.taskNumber);

    await expect(page.getByText(destinationCode!, { exact: true })).toBeVisible();
    await expect(page.getByText(task.line.sku, { exact: true })).toBeVisible();

    const request = page.waitForRequest(
      (req) =>
        req.url().includes(`/inventory/putaway/tasks/${task.taskId}/complete`) &&
        req.method() === "POST",
    );
    const response = page.waitForResponse(
      (res) =>
        res.url().includes(`/inventory/putaway/tasks/${task.taskId}/complete`) &&
        res.request().method() === "POST",
    );

    await confirmStep(page, String(PUTAWAY_QTY));

    const sent = (await request).postDataJSON() as {
      lines: Array<{ taskLineId: number; quantity: string; toLocationId?: number }>;
    };
    const posted = await response;
    expect(posted.status(), await posted.text()).toBeLessThan(300);

    const line = sent.lines?.[0];
    expect(line, `the request carried no lines: ${JSON.stringify(sent)}`).toBeTruthy();
    expect(line?.taskLineId).toBe(task.line.id);
    expect(Number(line?.quantity)).toBe(PUTAWAY_QTY);
    expect(line?.toLocationId).toBe(destinationId);

    await expect(page.getByText(`${task.line.sku} put away`)).toBeVisible({ timeout: 20_000 });

    await expect(async () => {
      const ledger = await recentLedger(api, target.variantId, 25);

      const issue = movementFor(ledger, {
        referenceType: "inv_putaway_task",
        referenceId: task.taskId,
        locationId: task.fromLocationId,
        transactionType: "TRANSFER_OUT",
      });
      const receiptRow = movementFor(ledger, {
        referenceType: "inv_putaway_task",
        referenceId: task.taskId,
        locationId: destinationId!,
        transactionType: "TRANSFER_IN",
      });

      expect(
        issue,
        `no TRANSFER_OUT for putaway ${task.taskId} at the receiving bin ${task.fromLocationId}; ` +
          `rows were ${describeLedger(ledger)}`,
      ).toBeTruthy();
      expect(
        receiptRow,
        `no TRANSFER_IN for putaway ${task.taskId} at the destination bin ${destinationId}; ` +
          `rows were ${describeLedger(ledger)}. A putaway that posts to a bin other than the one ` +
          `on screen returns 200 and shows the same success toast — this is the assertion that ` +
          `distinguishes them.`,
      ).toBeTruthy();

      expect(Number(issue!.quantityChange)).toBe(-PUTAWAY_QTY);
      expect(Number(issue!.quantityAfter)).toBe(Number(issue!.quantityBefore) - PUTAWAY_QTY);
      expect(Number(receiptRow!.quantityChange)).toBe(PUTAWAY_QTY);
      expect(Number(receiptRow!.quantityAfter)).toBe(
        Number(receiptRow!.quantityBefore) + PUTAWAY_QTY,
      );

      expect(await onHandFor(api, target.variantId, destinationId!)).toBe(
        Number(receiptRow!.quantityAfter),
      );
    }).toPass({ timeout: 30_000 });

    await expect(page.getByText(/Task finished/i)).toBeVisible({ timeout: 20_000 });
  });

  test("picking a wave line consumes the order's reservation at the bin on screen", async ({
    page,
    api,
    seeded,
  }) => {
    const { target, wave } = seeded;
    const binId = wave.line.location_id!;

    const before = await reservationFor(api, {
      variantId: target.variantId,
      soId: wave.soId,
      status: "ACTIVE",
    });
    expect(
      before,
      `order ${wave.soId} holds no ACTIVE reservation, so this walk has nothing to consume`,
    ).toBeTruthy();
    expect(before!.locationId).toBe(binId);
    expect(Number(before!.reservedQty)).toBe(PICK_QTY);

    await page.goto(`/inventory/rf/pick/${wave.pickListId}`);
    await expectRunnerFor(page, wave.pickNumber);

    await expect(page.getByText(wave.line.location_code!, { exact: true })).toBeVisible();
    await expect(page.getByText(wave.line.sku, { exact: true })).toBeVisible();

    const request = page.waitForRequest(
      (req) =>
        req.url().includes(`/inventory/picking/waves/${wave.pickListId}/confirm`) &&
        req.method() === "POST",
    );
    const response = page.waitForResponse(
      (res) =>
        res.url().includes(`/inventory/picking/waves/${wave.pickListId}/confirm`) &&
        res.request().method() === "POST",
    );

    await confirmStep(page, String(PICK_QTY));

    const sent = (await request).postDataJSON() as {
      pickLineId: number;
      quantityPicked: string;
    };
    const posted = await response;
    expect(posted.status(), await posted.text()).toBeLessThan(300);
    expect(sent.pickLineId).toBe(wave.line.id);
    expect(Number(sent.quantityPicked)).toBe(PICK_QTY);

    const body = (await posted.json()) as {
      data?: { pickedAtLocationId?: number };
      pickedAtLocationId?: number;
    };
    expect(body.data?.pickedAtLocationId ?? body.pickedAtLocationId).toBe(binId);

    await expect(page.getByText(`${wave.line.sku} confirmed`)).toBeVisible({ timeout: 20_000 });

    await expect(async () => {
      const detail = await api.get<{
        status: string;
        lines: Array<{ id: number; quantity_picked: string; line_closed: boolean }>;
      }>(`/inventory/picking/waves/${wave.pickListId}`);
      const walked = detail.lines.find((l) => l.id === wave.line.id);
      expect(walked, `wave ${wave.pickNumber} lost line ${wave.line.id}`).toBeTruthy();
      expect(Number(walked!.quantity_picked)).toBe(PICK_QTY);
      expect(walked!.line_closed).toBe(true);
      expect(detail.status).toBe("COMPLETED");
    }).toPass({ timeout: 30_000 });

    await expect(async () => {
      const stillActive = await reservationFor(api, {
        variantId: target.variantId,
        soId: wave.soId,
        status: "ACTIVE",
      });
      expect(
        stillActive,
        `order ${wave.soId} still holds an ACTIVE reservation after the pick was confirmed`,
      ).toBeUndefined();

      const consumed = await reservationFor(api, {
        variantId: target.variantId,
        soId: wave.soId,
        status: "CONSUMED",
      });
      expect(
        consumed,
        `order ${wave.soId} has no CONSUMED reservation; the pick closed the line without ` +
          `spending the promise behind it`,
      ).toBeTruthy();
      expect(consumed!.id).toBe(before!.id);
      expect(
        consumed!.locationId,
        "the reservation was consumed at a different bin than the one the picker was sent to",
      ).toBe(binId);
    }).toPass({ timeout: 75_000 });

    await expect(page.getByText(/Wave finished/i)).toBeVisible({ timeout: 20_000 });
  });
});
