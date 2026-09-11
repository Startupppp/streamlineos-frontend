import { readFileSync } from "node:fs";
import { join } from "node:path";

const FRONTEND_ROOT = join(__dirname, "..", "..", "..");

function read(relative: string): string {
  return readFileSync(join(FRONTEND_ROOT, relative), "utf8");
}

/**
 * Sending a quote must go through `POST /quotes/:quoteId/send`.
 *
 * All three send call sites used `PATCH /quotes/:id { status: "SENT" }`, which
 * reaches the generic update. That path writes `status` and `sentAt` and does
 * nothing else, so sending a quote skipped every guard the lifecycle service
 * applies — most sharply **"a quote pending approval cannot be sent"**, which is
 * the org's `maxDiscountPercent` control. It also wrote no `quote.sent` audit
 * row and emitted no `quote.sent` on the automation bus, so every rule a tenant
 * built on "when a quote is sent" never ran.
 *
 * These are source assertions rather than rendered ones on purpose. The defect
 * is *which endpoint a handler calls*, and a rendering test cannot see that: it
 * would pass identically against either path, because both return a quote and
 * both show the same toast. What must not regress is the call itself.
 */
describe("every quote send call site uses the dedicated endpoint", () => {
  const CALL_SITES = [
    "app/(authenticated)/crm/quotes/[quoteId]/page.tsx",
    "app/(authenticated)/crm/quotes/page.tsx",
    "features/crm/deals/deal-quotes-section.tsx",
  ];

  it.each(CALL_SITES)("%s calls useSendQuote", (file) => {
    expect(read(file)).toContain("useSendQuote");
  });

  it.each(CALL_SITES)("%s never patches a quote to SENT", (file) => {
    const source = read(file);
    /*
     * `status: "SENT"` handed to the generic status mutation is the bug. The
     * word SENT may legitimately appear elsewhere — a badge, a filter, a
     * comparison — so this looks for the mutation payload shape specifically.
     */
    expect(source).not.toMatch(/\{\s*id[^}]*status:\s*"SENT"/);
    expect(source).not.toMatch(/changeStatus\(\s*"SENT"\s*\)/);
  });

  /**
   * The list page needs its own assertion.
   *
   * There the literal `"SENT"` lives in `quote-row-actions.tsx`, which hands it
   * to a generic `onStatusUpdate(id, status)` — so the "never patches to SENT"
   * check above cannot see the bug on that page, and I verified it does not:
   * run against the pre-fix source it caught two of the three call sites. What
   * that page must do is branch, and route SENT to the send mutation.
   */
  it("the list page routes a SENT transition to the send mutation, not the patch", () => {
    const source = read("app/(authenticated)/crm/quotes/page.tsx");
    expect(source).toMatch(/if\s*\(\s*status === "SENT"\s*\)/);
    expect(source).toMatch(/sendQuote\.mutate\(/);
  });

  it("points the hook at the lifecycle route, not the generic update", () => {
    const hook = read("hooks/api/crm/quotes.ts");
    expect(hook).toContain("useSendQuote");
    expect(hook).toMatch(/apiClient\.post<Quote>\(`\/quotes\/\$\{id\}\/send`\)/);
  });

  /**
   * Accept and reject must NOT be moved onto `/approve` and `/reject`. Those
   * two resolve the internal *discount* approval — they read and write
   * `approvalStatus` and refuse anything not `pending` — and are a different
   * decision from the customer accepting the quote, which is `status`. Wiring
   * the customer's answer to them would refuse every quote that never needed a
   * discount approval in the first place.
   */
  it("leaves accept and reject on the generic update, which is correct", () => {
    const detail = read("app/(authenticated)/crm/quotes/[quoteId]/page.tsx");
    expect(detail).toMatch(/status:\s*"ACCEPTED"/);
    expect(detail).toMatch(/status:\s*"REJECTED"/);
  });
});
