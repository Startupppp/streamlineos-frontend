/**
 * Invoice money rounding, client side.
 *
 * Every value here is RUPEES. The server's rule is half-up at two decimals
 * (streamlineos-backend `src/modules/invoices/lib/invoice-helpers.ts` round2),
 * so anything the invoice screens preview has to use the same rule or the
 * number on screen is not the number that gets stored.
 *
 * `Math.round(value * 100) / 100` is NOT that rule. `value * 100` is a double
 * and for ordinary amounts it lands a hair below the .5 boundary, so it rounds
 * down: Rs 10.75 at 18% previewed 1.93 where the rule says 1.94, and Rs 0.70 at
 * 5% previewed 0.03 where the rule says 0.04. The error only ever went one way.
 */

/** The exact value of `value` at the ledger's scale of 4, as an integer. */
function toScale4(value: number): number {
  // toFixed(4) is exact decimal text; splitting it avoids ever multiplying a
  // double by 10000. Amounts here are far below 2^53 at scale 4, so the integer
  // arithmetic below is exact.
  const fixed = value.toFixed(4);
  const negative = fixed.startsWith("-");
  const [whole, fraction] = fixed.replace("-", "").split(".");
  const units = Number(whole) * 10000 + Number(fraction);
  return negative ? -units : units;
}

/** Half-up at two decimals — the rounding the server applies to the same value. */
export function roundInvoiceAmount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const scaled = toScale4(value);
  const negative = scaled < 0;
  const magnitude = negative ? -scaled : scaled;
  const remainder = magnitude % 100;
  const whole = (magnitude - remainder) / 100;
  const paise = remainder * 2 >= 100 ? whole + 1 : whole;
  return (negative ? -paise : paise) / 100;
}
