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

/**
 * INV-20 — the two RF flows an operator actually runs, walked end to end on the
 * device they are run on.
 *
 * `inventory-rf-375.spec.ts` measures the surface: nothing spills sideways,
 * nothing is painted over the task number, every control is thumb-sized. That
 * is the screen. This is the WORK — a receipt walked off the dock onto a shelf,
 * a wave walked into a tote — and it is verified where the work lands rather
 * than where it is announced.
 *
 * **The toast is not the outcome.** A putaway that posted to the wrong bin
 * returns 200 and says "put away" in green. So the putaway is checked in the
 * stock ledger: the issue at the receiving bin AND the receipt at the shelf,
 * each row's own before/after differing by exactly the quantity, each addressed
 * by the task's own id rather than by "the newest row of that type" — this
 * tenant is shared and a newest-row match is somebody else's write.
 *
 * The pick is checked differently because it moves differently, and the
 * difference is deliberate in the product: confirming a pick line posts NO
 * ledger movement. `PickConfirmService` documents why — a `SALE` here would be
 * posted a second time by `shipSo` — so what a confirm does is consume the
 * reservation. That is what is asserted: the order's reservation goes from
 * ACTIVE to CONSUMED **at the bin the screen sent the picker to**. Asserting a
 * ledger row instead would be asserting a movement the product deliberately
 * does not make, and it would fail for the right-looking wrong reason.
 */

const RF_VIEWPORT = { width: 375, height: 812 };

/** Received, and then put away. Small enough for any bin with headroom. */
const PUTAWAY_QTY = 4;
/** Picked. Must be available at a single bin or the allocator splits the line. */
const PICK_QTY = 2;

/**
 * The runner, with its own document on screen.
 *
 * Every assertion after this depends on being on the right screen, and three
 * other things answer on these routes with a heading: the permission wall, the
 * "could not load" card, and the loading skeleton — whose shell renders the
 * generic word ("Put away", "Pick") rather than the document's number. So the
 * heading is matched against the document's OWN reference, which none of the
 * three can produce.
 */
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

/** The one step on screen: scan, quantity, confirm. */
async function confirmStep(page: Page, quantity: string): Promise<void> {
  const step = page.getByLabel(/^Quantity/);
  await expect(step, "the RF step never rendered its quantity field").toBeVisible({
    timeout: 30_000,
  });
  await step.fill(quantity);
  await page.getByRole("button", { name: "Confirm" }).click();
}

/**
 * The oracle, the documents and the session, as fixtures rather than as hooks.
 *
 * `api` is worker-scoped, so one authenticated API context is built per worker
 * and disposed when that worker ends. `seeded` builds the work in that same
 * scope and carries its own budget, which is not tidiness: a dozen sequential
 * API calls inside a test spend the TEST's budget, and under `next dev` the
 * first visit to a route also pays for compiling it — the two together exhausted
 * 90 seconds and the failure pointed at a heading that had simply not been
 * reached.
 *
 * The documents are built through the backend's own commands, in the order the
 * warehouse does it: a purchase order that was sent, a receipt that posted
 * against it, and the putaway that receipt raised — claimed, because the RF
 * queue asks for work assigned to this operator and an unclaimed task is
 * somebody else's.
 */
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

/**
 * Runtime-selected, because whether this suite can run is a property of the
 * environment rather than of the code: with no seeded tenant there is nothing
 * for it to assert against. The reason rides along as an annotation so a skipped
 * run still says which variables are missing.
 */
const HAS_TENANT = hasTenantEnv();

const describeWithTenant: (title: string, details: TestDetails, callback: () => void) => void =
  HAS_TENANT ? test.describe : test.describe.skip;

const TENANT_DETAILS: TestDetails = HAS_TENANT
  ? {}
  : { annotation: { type: "skip", description: SKIP_REASON } };

describeWithTenant("inventory · RF walks", TENANT_DETAILS, () => {
  // `next dev` compiles a route the first time it is asked for, and these are
  // the first specs to visit the RF runners. That compile lands inside whichever
  // test gets there first, so the budget has to cover it.
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

    // The bin is shown to the operator in big mono type and it is the ONE piece
    // of information the walk turns on — they carry the box to what this says.
    // Asserting it means a screen that displays one bin and posts another fails
    // here rather than in the ledger, which is the difference between a
    // diagnosis and a mystery.
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
    // The bin the request names must be the bin the screen showed. Without
    // this, the ledger assertions below would take the destination FROM the
    // request and check against it — self-consistent, and blind to goods
    // shelved somewhere nobody will look for them.
    expect(line?.toLocationId).toBe(destinationId);

    await expect(page.getByText(`${task.line.sku} put away`)).toBeVisible({ timeout: 20_000 });

    // The outcome. `toPass` because the read model settles a beat after the
    // toast; the arithmetic inside is exact.
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

      // Each row has to agree with the movement it describes, or the ledger is
      // internally inconsistent even though both endpoints answered.
      expect(Number(issue!.quantityChange)).toBe(-PUTAWAY_QTY);
      expect(Number(issue!.quantityAfter)).toBe(Number(issue!.quantityBefore) - PUTAWAY_QTY);
      expect(Number(receiptRow!.quantityChange)).toBe(PUTAWAY_QTY);
      expect(Number(receiptRow!.quantityAfter)).toBe(
        Number(receiptRow!.quantityBefore) + PUTAWAY_QTY,
      );

      // And the projection has to agree with the ledger. This is what catches a
      // write that appended a movement and never updated the balance the
      // warehouse actually reads.
      expect(await onHandFor(api, target.variantId, destinationId!)).toBe(
        Number(receiptRow!.quantityAfter),
      );
    }).toPass({ timeout: 30_000 });

    // A task with one line is finished by walking that line, and the runner has
    // to say so — an operator left on a confirm screen for work already done
    // confirms it twice.
    await expect(page.getByText(/Task finished/i)).toBeVisible({ timeout: 20_000 });
  });

  test("picking a wave line consumes the order's reservation at the bin on screen", async ({
    page,
    api,
    seeded,
  }) => {
    const { target, wave } = seeded;
    const binId = wave.line.location_id!;

    // Held before the walk, and this is where a pick differs from an adjustment:
    // a confirm posts no ledger row, so there is no `quantityBefore` to read
    // afterwards. The reservation is the thing that moves, so its ACTIVE state
    // is established first — and asserting it here also means a wave that was
    // somehow already consumed fails as "the fixture is wrong" rather than as
    // "the walk did nothing".
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

    // The server's own answer to "where did these come off". It is the wrong-bin
    // guard for a flow with no ledger row to inspect: the screen sent the picker
    // to one bin, and this is the bin the reservation was actually closed at.
    const body = (await posted.json()) as {
      data?: { pickedAtLocationId?: number };
      pickedAtLocationId?: number;
    };
    expect(body.data?.pickedAtLocationId ?? body.pickedAtLocationId).toBe(binId);

    await expect(page.getByText(`${wave.line.sku} confirmed`)).toBeVisible({ timeout: 20_000 });

    await expect(async () => {
      // The line closed for the quantity asked, on the wave the walk was on.
      const detail = await api.get<{
        status: string;
        lines: Array<{ id: number; quantity_picked: string; line_closed: boolean }>;
      }>(`/inventory/picking/waves/${wave.pickListId}`);
      const walked = detail.lines.find((l) => l.id === wave.line.id);
      expect(walked, `wave ${wave.pickNumber} lost line ${wave.line.id}`).toBeTruthy();
      expect(Number(walked!.quantity_picked)).toBe(PICK_QTY);
      expect(walked!.line_closed).toBe(true);
      // One line, so closing it closes the wave. A wave left PENDING with every
      // line closed is work that never reaches packing.
      expect(detail.status).toBe("COMPLETED");
    }).toPass({ timeout: 30_000 });

    /**
     * And the promise the order was holding is now spent, at that bin. This is
     * the pick's equivalent of the ledger: a confirm that closed the line and
     * left the reservation ACTIVE would have sold the same units twice.
     *
     * Given its own window, and a long one, because of a cache gap this spec
     * measured. `listReservations` answers from `cachedVersioned` under
     * `inv:reservations:list:<org>` at `CACHE_TTL.SHORT` = 30s, and that
     * namespace is bumped by the reservations service's own writes and by
     * transfer dispatch/complete — but NOT by the pick path. Confirming a pick
     * consumes the reservation in the database and leaves this list showing it
     * as ACTIVE until the TTL expires: measured on 2026-09-10, reservation 453
     * was CONSUMED at 15:28:00 and the endpoint still reported ACTIVE 30
     * seconds later, which is what turned this assertion into a coin flip.
     *
     * So the window clears the TTL rather than sitting on it. The assertion
     * itself is unchanged and still exact — this is a slower read, not a weaker
     * one — and when the pick path starts invalidating that namespace the only
     * thing that changes is how quickly this passes.
     */
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
