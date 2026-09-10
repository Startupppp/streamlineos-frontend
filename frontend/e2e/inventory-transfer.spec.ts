import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  apiOracle,
  describeLedger,
  movementFor,
  onHandFor,
  recentLedger,
  type ApiOracle,
  type LedgerEntry,
  type WarehouseLocation,
} from "./fixtures/api";
import {
  binsWithHeadroom,
  postedReceipt,
  seedTarget,
  sentPurchaseOrder,
  type SeedTarget,
} from "./fixtures/documents";
import { signIn } from "./fixtures/session";
import { SKIP_REASON, hasTenantEnv, tenantEnv } from "./fixtures/tenant";

/**
 * INV-21, the transfer leg: stock is moved from one bin to another and the
 * books follow it the whole way.
 *
 * A transfer is not one movement, and that is the reason this spec is longer
 * than the adjust leg. Dispatch takes the goods off the source shelf and puts
 * them into the warehouse's transit location; completion takes them out of
 * transit and lands them at the destination. Two commands, four ledger rows,
 * and a window in between where the stock is on neither shelf — the state a
 * stocktake has to be able to explain. Asserting only the endpoints would pass
 * against an implementation that teleported the goods and left transit
 * permanently holding them.
 *
 * The stock being moved is received first, through the receiving chain, so the
 * source bin holds a known quantity on a known grain. Transferring whatever
 * happened to be in a bin makes the arithmetic depend on other suites.
 */

const TRANSFER_QTY = 3;
/** Received into the source bin first, so there is more there than we move. */
const STOCKED_QTY = 6;

/**
 * The New Transfer sheet's pickers carry no accessible name — `Combobox` takes
 * an `ariaLabel` and this call site does not pass one — so they cannot be
 * addressed the way every other form in these specs is. They are taken in DOM
 * order instead, which the component fixes: one `WarehouseLocationPicker`
 * renders From Warehouse then From Location, and the second renders To
 * Warehouse then To Location.
 *
 * Position is a weak address, so nothing rests on it. The option is matched on
 * its own unique code rather than its name, the trigger is then asserted to
 * show that entity, and the request body is checked against the ids that were
 * intended — so a picker taken in the wrong order swaps `from` and `to` and
 * fails on the request, loudly, rather than moving stock the wrong way quietly.
 */
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

/** The four rows a completed transfer must have written, in order of travel. */
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

test.describe("inventory · stock transfer", () => {
  test.skip(!hasTenantEnv(), SKIP_REASON);

  let api: ApiOracle;
  let target: SeedTarget;
  let destination: WarehouseLocation | undefined;

  test.beforeAll(async () => {
    // The seed is a chain of backend commands, and this machine runs several
    // backends against one shared remote cache — a single list read here has
    // been measured at ten seconds. The default budget is sized for a test, not
    // for building the documents one needs, and when it ran out the failure
    // pointed at a heading that had simply not been reached yet.
    test.setTimeout(300_000);
    api = await apiOracle();
    target = await seedTarget(api, STOCKED_QTY);

    // Stock the source bin through the real receiving chain, so the quantity
    // being moved is one this suite put there and the arithmetic below does not
    // depend on what any other suite left behind. In `beforeAll` because it is
    // several sequential round trips and the test's budget is for the four
    // screens it drives.
    const po = await sentPurchaseOrder(api, target, STOCKED_QTY, "INV-21 transfer leg");
    await postedReceipt(api, po, target, STOCKED_QTY);

    destination = (
      await binsWithHeadroom(api, target.warehouseId, TRANSFER_QTY, [target.bin.id])
    )[0];
  });

  test.afterAll(async () => {
    await api?.dispose();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    // Four screens, three commands and a `next dev` compile of each route on
    // first visit. The default budget covers the click, not the compile.
    test.setTimeout(180_000);
    await signIn(context, tenantEnv().user, baseURL as string);
  });

  test("a transfer walks the stock from one bin to another and the ledger follows", async ({
    page,
  }) => {
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
    // Matched on the SKU, which is unique, and confirmed by the product name,
    // which is what the trigger renders. Two different strings on purpose.
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

    // Direction is the whole content of a transfer, and the two pickers are
    // addressed by position. This is where that becomes safe.
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

    // A created transfer has moved NOTHING. Asserting that before dispatching
    // is what separates "the paperwork exists" from "the stock moved", and an
    // implementation that debited the source on create would pass every
    // later assertion in this file without it.
    expect(await onHandFor(api, target.variantId, target.bin.id)).toBe(sourceBefore);

    await page.goto(`/inventory/stock/transfers/${transferId}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(reference!, {
      timeout: 30_000,
    });

    await clickAndAwait(page, "Reserve Transfer", `/inventory/stock/transfers/${transferId}/reserve`);
    await expect(page.getByText("Transfer reserved")).toBeVisible({ timeout: 20_000 });

    // Reserving holds stock; it does not move it. Same reasoning as above, and
    // the two are routinely confused because both change the document's status.
    expect(await onHandFor(api, target.variantId, target.bin.id)).toBe(sourceBefore);

    await clickAndAwait(
      page,
      "Dispatch Transfer",
      `/inventory/stock/transfers/${transferId}/dispatch`,
    );
    await expect(page.getByText("Transfer dispatched")).toBeVisible({ timeout: 20_000 });

    // Dispatch is the first real movement: off the source shelf and into
    // transit. The goods are now on neither shelf, and the destination must not
    // have been credited yet — a transfer that credits on dispatch shows stock
    // in two buildings at once for the length of the journey.
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
    // The sheet arrives pre-filled with what was dispatched, which is what a
    // storeman confirms in the ordinary case.
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

      // Conservation. The source is down by exactly what the destination is up
      // by, and nothing was created or lost in transit — which is the one thing
      // a two-command move can silently get wrong.
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

/**
 * Click a lifecycle button and wait for the command it stands for.
 *
 * Waiting for the RESPONSE rather than for the next button to appear: these
 * actions re-render the header, so "the next button is on screen" is satisfied
 * by a stale render as well as by a successful command, and a failed command
 * leaves the old button in place — which reads as a slow click rather than a
 * refusal.
 */
async function clickAndAwait(page: Page, button: string, path: string): Promise<void> {
  const response = page.waitForResponse(
    (res) => res.url().includes(path) && res.request().method() === "POST",
  );
  await page.getByRole("button", { name: button }).click();
  const settled = await response;
  expect(settled.status(), `${button} → ${await settled.text()}`).toBeLessThan(300);
}
