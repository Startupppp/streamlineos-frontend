import { roundInvoiceAmount } from "./invoice-money";

/**
 * These are the same cases the backend pins in
 * `src/modules/invoices/lib/invoice-rounding.spec.ts`. They live on both sides
 * on purpose: the invoice screens preview a total before the server has seen
 * it, so the only way the preview can be the stored figure is for the two
 * roundings to be the same rule. Everything is rupees.
 */
describe("roundInvoiceAmount rounds money half-up at two decimals", () => {
  const gstCases: ReadonlyArray<[number, number, number]> = [
    [10.75, 18, 1.94],
    [6.75, 18, 1.22],
    [5.75, 18, 1.04],
    [1.25, 18, 0.23],
    [0.7, 5, 0.04],
    [2.25, 12, 0.27],
  ];

  it.each(gstCases)("taxes Rs %s at %s%% as Rs %s", (amount, rate, expected) => {
    expect(roundInvoiceAmount(amount * (rate / 100))).toBe(expected);
  });

  it("rounds a qty x rate product up at the half-paisa boundary", () => {
    expect(roundInvoiceAmount(1 * 1.005)).toBe(1.01);
    expect(roundInvoiceAmount(2.675)).toBe(2.68);
  });

  it("rounds down below the boundary and up above it", () => {
    expect(roundInvoiceAmount(1.004)).toBe(1);
    expect(roundInvoiceAmount(1.006)).toBe(1.01);
  });

  it("leaves values that need no rounding alone", () => {
    expect(roundInvoiceAmount(0)).toBe(0);
    expect(roundInvoiceAmount(1000)).toBe(1000);
    expect(roundInvoiceAmount(1180.5)).toBe(1180.5);
  });

  it("carries a negative amount away from zero, symmetrically", () => {
    expect(roundInvoiceAmount(-1.005)).toBe(-1.01);
    expect(roundInvoiceAmount(-1.004)).toBe(-1);
  });

  it("survives a line at the DTO's ceiling without losing paise", () => {
    // The write DTO caps a line at Rs 999,999,999.99; scale 4 of that is well
    // inside the exact-integer range, so no precision is lost on the way.
    expect(roundInvoiceAmount(999999999.994)).toBe(999999999.99);
    expect(roundInvoiceAmount(999999999.995)).toBe(1000000000);
  });

  it("returns 0 for a non-finite input rather than NaN", () => {
    expect(roundInvoiceAmount(Number.NaN)).toBe(0);
    expect(roundInvoiceAmount(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
