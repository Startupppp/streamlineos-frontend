import { expect, test as base, type TestDetails } from "@playwright/test";
import {
  apiOracle,
  findLocationWithHeadroom,
  onHandFor,
  recentLedger,
  type ApiOracle,
} from "./fixtures/api";
import { chooseFirstOption, chooseFromCombobox } from "./fixtures/combobox";
import { signIn } from "./fixtures/session";
import { SKIP_REASON, hasTenantEnv, tenantEnv } from "./fixtures/tenant";

/**
 * INV-21, the adjust leg: an operator corrects on-hand from the UI.
 *
 * The point of the spec is the last third. Filling a sheet and seeing a toast
 * proves a form submitted, not that stock moved — an endpoint that accepted the
 * request and wrote nothing produces exactly the same toast. So the ledger row
 * the adjustment should have written is checked for the arithmetic it should
 * contain, and the projection is then checked against the ledger.
 *
 * The before-quantity is taken from the ledger's own `quantityBefore` rather
 * than snapshotted ahead of the click. Snapshotting races the write, and a
 * `before` read a moment too late turns a real regression into a passing test.
 */

const ADJUST_QTY = 7;

/**
 * The wire shape, which is not the form's shape.
 *
 * `useCreateAdjustment` folds the sheet's flat fields into a `lines[]` envelope
 * and turns Direction + Quantity into ONE signed `quantityChange`. Reading the
 * form's field names off the request yields `undefined`, and `undefined` in an
 * arithmetic assertion is a test that cannot fail for the right reason.
 */
interface AdjustmentRequest {
  reason: string;
  lines: Array<{
    productVariantId: number;
    locationId: number;
    /** Signed: positive is IN, negative is OUT. */
    quantityChange: number;
  }>;
}

/**
 * The oracle and the session, as fixtures rather than as hooks.
 *
 * `api` is worker-scoped, so one authenticated API context is built per worker
 * and disposed when that worker ends — the lifetime a `beforeAll`/`afterAll`
 * pair was standing in for, without the pair. `signedIn` is an auto fixture, so
 * every test in this file gets a browser context carrying a real session cookie
 * before it opens a page.
 */
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

describeWithTenant("inventory · adjust", TENANT_DETAILS, () => {
  test("an adjustment moves on-hand by the quantity entered, and the ledger agrees", async ({
    page,
    api,
  }) => {
    // Where to put the stock is decided before the UI is touched, and decided
    // on capacity rather than on list order. Bins carry a cap and the backend
    // rejects an over-fill outright; the first bin in this tenant is a capacity
    // probe that is already exactly full, so "pick the first option" fails on a
    // business rule that has nothing to do with adjusting stock.
    const target = await findLocationWithHeadroom(api, ADJUST_QTY);

    await page.goto("/inventory/stock/adjustments");

    await page.getByRole("button", { name: /New Adjustment/i }).first().click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText("New Stock Adjustment")).toBeVisible();

    // Each picker by its accessible name, each option by the name the operator
    // sees. Ids are database sequences: pinning them would make this spec pass
    // on one database and fail everywhere else for a reason that is not the
    // flow. The names are exact strings rather than the anchored patterns this
    // used to need — "Location" no longer also matches "Scrap Location", because
    // the name is the field's own label and not the text of a wrapping div.
    await chooseFromCombobox(sheet, "Warehouse", target.warehouseName);
    await chooseFromCombobox(sheet, "Location", target.locationName);
    await chooseFirstOption(sheet, "Product Variant");

    await sheet.getByLabel(/Quantity/).fill(String(ADJUST_QTY));

    // Direction defaults to "In (Add stock)", which is the happy path this leg
    // is about. Asserted rather than assumed: a changed default would silently
    // make this an OUT adjustment, and the arithmetic below would then be
    // checking the wrong sign while still passing.
    await expect(sheet.getByRole("combobox", { name: "Direction *" })).toContainText(
      "In (Add stock)",
    );

    // Which grain the form settled on is not rendered — a visible raw id would
    // itself be a defect — so it is read off the request the page sends.
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

    // Positive, because Direction is IN. This is where the sign is pinned: the
    // UI turns a direction and an unsigned quantity into one signed number, and
    // if that mapping inverted every assertion below would still be internally
    // consistent while the stock moved the wrong way.
    expect(line?.quantityChange).toBe(ADJUST_QTY);

    // The bin the request names must be the bin the operator picked. Without
    // this the spec would take the location OUT of the request and then verify
    // the ledger against it — self-consistent, and blind to a form that posts
    // stock to a different bin than the one on screen, which is exactly the
    // kind of defect that ends with goods counted in the wrong place.
    expect(line?.locationId).toBe(target.locationId);

    // The toast is the UI's claim, and it is asserted because a silent failure
    // is otherwise indistinguishable from a slow one. It is not the outcome.
    await expect(page.getByText(/Adjustment created/i)).toBeVisible({ timeout: 20_000 });
    await expect(sheet).toBeHidden();

    // An adjustment that lands in PENDING_APPROVAL is a different flow and
    // moves no stock. Naming it here means this spec fails with "it needed
    // approval" rather than with "the ledger row is missing".
    const body = (await response.json()) as {
      data?: { status?: string; referenceNumber?: string };
      status?: string;
      referenceNumber?: string;
    };
    const status = body.data?.status ?? body.status;
    expect(status, "an approval-gated adjustment posts nothing; this leg needs the direct-post path").toBe("POSTED");

    // The outcome. `toPass` because the read model invalidates a beat after the
    // toast; the assertions inside are exact.
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

      // The balance pair has to agree with the movement it describes, or the
      // ledger is self-inconsistent even though both endpoints answered.
      const before = Number(entry?.quantityBefore);
      const after = Number(entry?.quantityAfter);
      expect(after).toBe(before + ADJUST_QTY);

      // And the projection has to agree with the ledger. This is the assertion
      // that catches a write that appended a movement and never updated the
      // balance operators actually read.
      const projected = await onHandFor(api, line.productVariantId, line.locationId);
      expect(projected).toBe(after);
    }).toPass({ timeout: 25_000 });

    // Finally, back on the list the operator lands on. A create that succeeds
    // and never appears reads as a lost record, which is the same bug to the
    // person doing the work — and asserting THIS adjustment by its own
    // reference number, rather than that the table is non-empty, is what makes
    // it an assertion about the flow instead of about the fixture.
    const reference = (body.data?.referenceNumber ?? body.referenceNumber) as string;
    expect(reference, "the create response carried no reference number").toBeTruthy();

    await page.goto("/inventory/stock/adjustments");
    await expect(page.getByRole("table")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("cell", { name: reference })).toBeVisible({
      timeout: 20_000,
    });
  });
});
