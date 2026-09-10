import { expect, test } from "@playwright/test";
import {
  apiOracle,
  describeLedger,
  movementFor,
  onHandFor,
  recentLedger,
  type ApiOracle,
} from "./fixtures/api";
import { chooseFromComboboxBy } from "./fixtures/combobox";
import {
  seedTarget,
  sentPurchaseOrder,
  type PurchaseOrderRow,
  type SeedTarget,
} from "./fixtures/documents";
import { signIn } from "./fixtures/session";
import { SKIP_REASON, hasTenantEnv, tenantEnv } from "./fixtures/tenant";

/**
 * INV-21, the purchase-order receive leg: a delivery arrives and somebody
 * counts it in.
 *
 * The document this drives cannot be created from the frontend at all — there
 * is no "new receipt" screen; receiving starts from a purchase order that was
 * already sent, and this tenant had none. So the order is built first through
 * the backend's own commands (create, approve where required, send) and the
 * spec then drives the screen the operator actually uses.
 *
 * As with the adjust leg, the point is the last third. "GRN-00007 posted to
 * stock" in green proves a request was accepted, not that anything arrived: a
 * receipt posted against the wrong bin returns exactly the same toast. So the
 * movement is read out of the ledger, addressed by the receipt's own id, and
 * checked for the arithmetic it should contain.
 */

const RECEIVE_QTY = 5;

interface ReceiveRequest {
  locationId: number;
  receivedDate: string;
  lines: Array<{ poLineId: number; quantityReceived: string; qualityStatus: string }>;
}

test.describe("inventory · receive against a purchase order", () => {
  test.skip(!hasTenantEnv(), SKIP_REASON);

  let api: ApiOracle;
  let target: SeedTarget;
  let po: PurchaseOrderRow;

  test.beforeAll(async () => {
    // The seed is a chain of backend commands, and this machine runs several
    // backends against one shared remote cache — a single list read here has
    // been measured at ten seconds. The default budget is sized for a test, not
    // for building the documents one needs, and when it ran out the failure
    // pointed at a heading that had simply not been reached yet.
    test.setTimeout(300_000);
    api = await apiOracle();
    target = await seedTarget(api, RECEIVE_QTY);

    // Seeded here rather than in the test: creating the vendor, the order and
    // then approving and sending it is several sequential round trips, and
    // spending the test's own budget on them leaves the failure pointing at a
    // heading that was never reached rather than at the screen under test.
    po = await sentPurchaseOrder(api, target, RECEIVE_QTY, "INV-21 receive leg");
  });

  test.afterAll(async () => {
    await api?.dispose();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    // `next dev` compiles a route the first time it is asked for, and the
    // purchase-order detail page is a heavy one. That compile lands inside this
    // test, so the budget has to cover it.
    test.setTimeout(180_000);
    await signIn(context, tenantEnv().user, baseURL as string);
  });

  test("counting a delivery in posts it to stock, and the ledger agrees", async ({ page }) => {
    const poLineId = po.lines[0]!.id;

    await page.goto(`/inventory/purchase-orders/${po.id}`);

    // The order's own number as the heading, before anything is clicked. Two
    // other pages answer on this route with a heading — the permission wall and
    // the not-found card — and neither can produce this string, so this is what
    // makes everything below an assertion about the purchase order rather than
    // about whatever rendered.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(po.poNumber, {
      timeout: 30_000,
    });

    // The control only exists for an order that is SENT or PARTIAL and still
    // owes something. Its absence is a legitimate product state, so failing on
    // the button rather than on a later step is what tells you which.
    await page.getByRole("button", { name: "Receive goods" }).click();

    const sheet = page.getByRole("dialog", { name: "Receive Goods" });
    await expect(sheet).toBeVisible();

    // Chosen by the bin's CODE and confirmed by its NAME. Bins in this tenant
    // are called "Race bin" and "Race bin 2", and an option matched on the
    // shorter name silently selects either — putting the goods in a bin nobody
    // will look in, which is the exact defect this spec ends by ruling out.
    await chooseFromComboboxBy(
      sheet,
      "Receive at Location",
      `Code: ${target.bin.code}`,
      target.bin.name,
    );

    await sheet.getByLabel("Qty received").fill(String(RECEIVE_QTY));

    // Quality defaults to accepted, and this leg is about accepted goods. A
    // changed default would post a rejection — which moves no stock — and every
    // assertion below would then be looking for a movement that was never
    // supposed to happen.
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

    // The bin the request names must be the bin the operator picked. Without
    // this the ledger check below would take the location OUT of the request
    // and verify against it — self-consistent, and blind to a form that posts a
    // delivery into a different bin than the one on screen.
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

    // PINNED DEFECT, not an endorsement.
    //
    // `POST /inventory/purchase-orders/:poId/receive` moves the stock — the
    // ledger row below proves it — and posts the GL entry, but it inserts the
    // goods receipt with the table default and never stamps `status` or
    // `posted_at`. Measured: GRN-00003/4/5 in this tenant all carry a `GRN`
    // movement at bin 431 and all sit at `DRAFT` with a null `posted_at`, while
    // the two-step path (`POST /inventory/goods-receipts` then `/:grnId/post`)
    // leaves them `POSTED`.
    //
    // It matters because of what the receipts workbench then offers. A DRAFT
    // receipt renders `Post to stock`, and `GrnPostService.postInTx` refuses
    // only `POSTED` and `CANCELLED` — so pressing it writes a SECOND set of
    // movements for a delivery that has already landed. The screen invites a
    // double receipt.
    //
    // This is asserted as it currently behaves, deliberately: this repository
    // must not edit the backend, and a spec that quietly skipped the status
    // would leave nothing anywhere pointing at it. When the receive path starts
    // stamping the receipt, this line goes red and is the place that says why.
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
      // The balance pair has to agree with the movement it describes.
      expect(Number(entry!.quantityAfter)).toBe(Number(entry!.quantityBefore) + RECEIVE_QTY);

      // And the projection has to agree with the ledger — this is what catches
      // a write that appended a movement and never updated the balance a
      // storeman actually reads off the shelf list.
      expect(await onHandFor(api, target.variantId, target.bin.id)).toBe(
        Number(entry!.quantityAfter),
      );
    }).toPass({ timeout: 30_000 });

    // The order itself has to move on. A purchase order still SENT after its
    // only line was fully received reads to a buyer as a delivery that never
    // arrived, and it stays on the chase list forever.
    await expect(async () => {
      const after = await api.get<{ status: string }>(`/inventory/purchase-orders/${po.id}`);
      expect(after.status).toBe("RECEIVED");
    }).toPass({ timeout: 20_000 });

    // And the receipt appears on the screen that lists deliveries, by its own
    // number. A post that succeeds and never shows up is a lost record to the
    // person doing the counting.
    await page.goto("/inventory/operations/receipts");
    await expect(page.getByRole("table")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("cell", { name: grnNumber! })).toBeVisible({ timeout: 20_000 });
  });
});
