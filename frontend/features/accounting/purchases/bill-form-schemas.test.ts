/**
 * The bill totals panel is a PREVIEW OF A ROW THAT WILL BE WRITTEN, not an
 * independent calculation, so every figure here is pinned to what
 * `accounting-payables.service.ts#createPurchaseBill` stores for the same input.
 *
 * The defect this pins: the panel used to halve the tax pool in doubles at
 * scale 2 (`round2(taxPool / 2)`), while the backend allocates it exactly at
 * scale 4 via `allocateDecimal(taxPool, ["1", "1"])`. An approver signing off a
 * bill whose CGST read 4.51 got a ledger row of 4.5050 — and the two halves no
 * longer summed to the pool, so the preview total was not the stored total.
 *
 * The expected values below are the backend's own output, produced by running
 * `allocateDecimal` from `backend/src/modules/accounting/core/money.util.ts`
 * over the same three pools. They are ground truth, not arithmetic done here.
 *
 *   pool 9.01  -> 4.5050 / 4.5050   (doubles gave 4.51 / 4.50)
 *   pool 0.05  -> 0.0250 / 0.0250   (doubles gave 0.03 / 0.02)
 *   pool 18.05 -> 9.0250 / 9.0250   (doubles gave 9.03 / 9.02)
 */
import { computeTotals, lineAmount, type NewBillFormValues } from "./bill-form-schemas";
import { addDecimals, compareDecimals } from "@/lib/accounting/decimal";

type Items = NewBillFormValues["items"];

function itemsFor(quantity: string, rate: string): Items {
  return [
    {
      description: "Consulting",
      hsnSacCode: "998311",
      quantity,
      rate,
      gstRate: "18",
    },
  ];
}

/** Same state code on both sides, so the supply is intra-state and splits CGST/SGST. */
const INTRA = { supplierGstin: "29ABCDE1234F1Z5", placeOfSupply: "29" };

describe("bill totals panel matches the row the backend writes", () => {
  it.each([
    { rate: "50.06", pool: "9.0100", half: "4.5050", doubleHalves: ["4.51", "4.50"] },
    { rate: "0.28", pool: "0.0500", half: "0.0250", doubleHalves: ["0.03", "0.02"] },
    { rate: "100.28", pool: "18.0500", half: "9.0250", doubleHalves: ["9.03", "9.02"] },
  ])(
    "splits a $pool tax pool exactly in half, not $doubleHalves",
    ({ rate, pool, half, doubleHalves }) => {
      const totals = computeTotals(itemsFor("1", rate), INTRA.supplierGstin, INTRA.placeOfSupply, "0");

      expect(totals.intra).toBe(true);
      expect(totals.taxPool).toBe(pool);
      expect(totals.cgst).toBe(half);
      expect(totals.sgst).toBe(half);
      expect(totals.igst).toBe("0.0000");

      // The two halves must reconstitute the pool. This is what the scale-2
      // double split broke: 4.51 + 4.50 = 9.01 held, but 0.03 + 0.02 = 0.05 and
      // 9.03 + 9.02 = 18.05 only held by luck of the rounding direction, and
      // neither half was the amount posted to its tax account.
      expect(addDecimals(totals.cgst, totals.sgst)).toBe(pool);
      expect(totals.cgst).not.toBe(doubleHalves[0]);
      expect(totals.sgst).not.toBe(doubleHalves[1]);
    },
  );

  it("keeps the whole pool as IGST when the supply is inter-state", () => {
    const totals = computeTotals(itemsFor("1", "50.06"), "29ABCDE1234F1Z5", "27", "0");

    expect(totals.intra).toBe(false);
    expect(totals.igst).toBe("9.0100");
    expect(totals.cgst).toBe("0.0000");
    expect(totals.sgst).toBe("0.0000");
  });

  it("computes subtotal, tax and total in the backend's order", () => {
    const totals = computeTotals(itemsFor("1", "50.06"), INTRA.supplierGstin, INTRA.placeOfSupply, "0");

    expect(totals.subtotal).toBe("50.0600");
    expect(totals.total).toBe("59.0700");
  });

  it("subtracts the discount after tax, as createPurchaseBill does", () => {
    const totals = computeTotals(itemsFor("1", "50.06"), INTRA.supplierGstin, INTRA.placeOfSupply, "1.50");

    expect(totals.total).toBe("57.5700");
  });

  it("rounds a line amount at scale 2 before it enters the subtotal", () => {
    // 3 x 33.335 = 100.005, which must land on 100.01 the way the backend's
    // roundDecimal(amountOf(qty, rate), 2) does — not 100.00 from a truncation.
    expect(lineAmount("3", "33.335")).toBe("100.01");
  });

  it("sums many lines without drifting from the pool", () => {
    const items: Items = Array.from({ length: 7 }, () => ({
      description: "Line",
      hsnSacCode: "998311",
      quantity: "1",
      rate: "0.28",
      gstRate: "18" as const,
    }));
    const totals = computeTotals(items, INTRA.supplierGstin, INTRA.placeOfSupply, "0");

    // Seven 0.05 taxes = 0.35, halved exactly to 0.1750 each.
    expect(totals.taxPool).toBe("0.3500");
    expect(totals.cgst).toBe("0.1750");
    expect(totals.sgst).toBe("0.1750");
    expect(compareDecimals(addDecimals(totals.cgst, totals.sgst), totals.taxPool)).toBe(0);
  });

  it("treats a half-typed row as zero rather than NaN", () => {
    const totals = computeTotals(
      [{ description: "", hsnSacCode: "", quantity: "", rate: "abc", gstRate: "18" }],
      INTRA.supplierGstin,
      INTRA.placeOfSupply,
      "",
    );

    expect(totals.subtotal).toBe("0.0000");
    expect(totals.taxPool).toBe("0.0000");
    expect(totals.total).toBe("0.0000");
  });
});
