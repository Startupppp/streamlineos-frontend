import { JOURNAL_SOURCE_LABELS, sourceDocumentHref } from "../journal-source";

describe("journal source labels", () => {
  it("labels a landed-cost journal as landed cost, not as a stock movement (INV-38)", () => {
    expect(JOURNAL_SOURCE_LABELS.landed_cost).toBe("Landed cost");
    expect(JOURNAL_SOURCE_LABELS.landed_cost).not.toBe(JOURNAL_SOURCE_LABELS.stock_move);
  });

  it("offers no link for a voucher, which has no page of its own", () => {
    expect(sourceDocumentHref("landed_cost", "12")).toBeNull();
    expect(sourceDocumentHref("purchase_bill", "b-1")).toBe("/accounting/purchase-bills/b-1");
  });
});
