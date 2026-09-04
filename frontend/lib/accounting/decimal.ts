/**
 * Exact decimal arithmetic at the ledger's scale, for the one job the client
 * legitimately has: showing the approver the SAME figures the backend will store.
 *
 * This is a port of the backend's `accounting/core/money.util.ts` — same scale,
 * same rounding, same allocation — and it is not a second implementation of
 * business logic. The bill totals panel computed its GST split in doubles at
 * scale 2 while `accounting-payables.service.ts` computed it exactly at scale 4,
 * so a tax pool of 9.01 was previewed as CGST 4.51 / SGST 4.50 and stored as
 * 4.5050 / 4.5050. The number a user approves has to be the number that is saved.
 *
 * Amounts are carried as decimal strings. Never widen this to arbitrary maths —
 * anything beyond presenting what the server will compute belongs on the server.
 */
const SCALE = 4;

/**
 * This file is the frontend's only BigInt user and `tsconfig.json` targets
 * ES2018, where the `123n` literal syntax the backend's `money.util.ts` uses is
 * a compile error (TS2737). The `lib` is `esnext`, so the BigInt *global* is
 * typed and available — only the literal form is out of reach. These constants
 * carry the values the literals would have, and every other site calls
 * `BigInt(...)`, so the arithmetic is identical to the backend's.
 */
const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const TEN = BigInt(10);
const FACTOR = BigInt(10000);

const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

function pow10(exponent: number): bigint {
  return TEN ** BigInt(exponent);
}

function parseToScaled(value: string | undefined): bigint {
  const str = (value ?? "0").trim() || "0";
  if (!DECIMAL_PATTERN.test(str)) throw new Error(`Not a decimal amount: ${JSON.stringify(str)}`);
  const negative = str.startsWith("-");
  const abs = str.replace(/^[+-]/, "");
  const dotIdx = abs.indexOf(".");
  const intPart = dotIdx === -1 ? abs : abs.slice(0, dotIdx);
  const fracPart = dotIdx === -1 ? "" : abs.slice(dotIdx + 1);
  const paddedFrac = fracPart.padEnd(SCALE, "0").slice(0, SCALE);
  const scaled = BigInt(intPart || "0") * FACTOR + BigInt(paddedFrac || "0");
  return negative ? -scaled : scaled;
}

function scaledToString(scaled: bigint, dp: number = SCALE): string {
  const negative = scaled < ZERO;
  const abs = negative ? -scaled : scaled;
  const intPart = abs / FACTOR;
  const fracPart = abs % FACTOR;
  const truncFrac = fracPart.toString().padStart(SCALE, "0").slice(0, dp);
  const base = dp === 0 ? intPart.toString() : `${intPart.toString()}.${truncFrac}`;
  return negative ? `-${base}` : base;
}

function renderRounded(scaled: bigint, dp: number): string {
  const negative = scaled < ZERO;
  const abs = negative ? -scaled : scaled;
  const divisor = pow10(Math.max(SCALE - dp, 0));
  const quotient = abs / divisor;
  const remainder = abs % divisor;
  const units = remainder * TWO >= divisor ? quotient + ONE : quotient;
  const unitFactor = pow10(Math.min(dp, SCALE));
  const intPart = units / unitFactor;
  const fracDigits =
    dp === 0 ? "" : (units % unitFactor).toString().padStart(Math.min(dp, SCALE), "0").padEnd(dp, "0");
  const body = dp === 0 ? intPart.toString() : `${intPart.toString()}.${fracDigits}`;
  return negative && units !== ZERO ? `-${body}` : body;
}

export function addDecimals(a: string, b: string): string {
  return scaledToString(parseToScaled(a) + parseToScaled(b));
}

export function subtractDecimals(a: string, b: string): string {
  return scaledToString(parseToScaled(a) - parseToScaled(b));
}

export function multiplyDecimals(a: string, b: string): string {
  const product = parseToScaled(a) * parseToScaled(b);
  const negative = product < ZERO;
  const absProduct = negative ? -product : product;
  const rounded = (absProduct + FACTOR / TWO) / FACTOR;
  return scaledToString(negative ? -rounded : rounded);
}

export function divideDecimals(a: string, b: string): string {
  const sb = parseToScaled(b);
  if (sb === ZERO) throw new Error("Division by zero");
  const numerator = parseToScaled(a) * FACTOR;
  const negative = numerator < ZERO !== sb < ZERO;
  const absNumerator = numerator < ZERO ? -numerator : numerator;
  const absDenominator = sb < ZERO ? -sb : sb;
  const quotient = (absNumerator * TWO + absDenominator) / (absDenominator * TWO);
  return scaledToString(negative ? -quotient : quotient);
}

export function compareDecimals(a: string, b: string): number {
  const sa = parseToScaled(a);
  const sb = parseToScaled(b);
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

export function formatDecimal(a: string, dp: number = SCALE): string {
  return scaledToString(parseToScaled(a), dp);
}

/** Half-up at `dp`, the rounding a reader expects on a printed total. */
export function roundDecimal(a: string, dp: number = 2): string {
  return renderRounded(parseToScaled(a), dp);
}

/**
 * The boundary conversion for a form field. An empty, malformed or negative
 * entry is zero, matching the `num()` the bill form has always used, so a
 * half-typed row never blanks the totals panel.
 */
export function toDecimalInput(value: string): string {
  const trimmed = (value ?? "").trim();
  if (trimmed === "" || !DECIMAL_PATTERN.test(trimmed)) return "0.0000";
  const scaled = parseToScaled(trimmed);
  return scaledToString(scaled < ZERO ? ZERO : scaled);
}

/**
 * A signed amount arriving from the API as `numeric` text. Absent, empty or
 * malformed reads as zero rather than throwing in a render; a bank balance may
 * legitimately be negative, so unlike `toDecimalInput` the sign is kept.
 */
export function toDecimalAmount(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (trimmed === "" || !DECIMAL_PATTERN.test(trimmed)) return "0.0000";
  return scaledToString(parseToScaled(trimmed));
}

export function sumDecimals(values: Iterable<string>): string {
  let total = ZERO;
  for (const value of values) total += parseToScaled(value);
  return scaledToString(total);
}

/**
 * Splits `total` across `weights` so the parts sum to `total` exactly — largest
 * remainder, so the rounding residue lands on the largest shares instead of
 * vanishing.
 */
export function allocateDecimal(total: string, weights: ReadonlyArray<string>): string[] {
  const scaledTotal = parseToScaled(total);
  const scaledWeights = weights.map((weight) => {
    const value = parseToScaled(weight);
    return value < ZERO ? -value : value;
  });
  const weightSum = scaledWeights.reduce((acc, weight) => acc + weight, ZERO);
  if (weightSum === ZERO) return weights.map(() => "0.0000");

  const negative = scaledTotal < ZERO;
  const absTotal = negative ? -scaledTotal : scaledTotal;

  const parts = scaledWeights.map((weight) => {
    const numerator = absTotal * weight;
    return { base: numerator / weightSum, remainder: numerator % weightSum };
  });

  let leftover = absTotal - parts.reduce((acc, part) => acc + part.base, ZERO);
  const order = parts
    .map((part, index) => ({ index, remainder: part.remainder }))
    .sort((a, b) => (a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1));
  for (const entry of order) {
    if (leftover <= ZERO) break;
    const part = parts[entry.index];
    if (part) part.base += ONE;
    leftover -= ONE;
  }

  return parts.map((part) => scaledToString(negative ? -part.base : part.base));
}

/**
 * Renders an amount the way the ledger holds it: two decimals when the value is
 * exact there, four when it is not. A GST half of 4.5050 shown as "4.51" is the
 * same lie the double arithmetic told — the two halves would appear to sum to
 * 9.02 against a 9.01 pool.
 */
export function formatLedgerAmount(a: string): string {
  const atTwo = formatDecimal(a, 2);
  return compareDecimals(atTwo, a) === 0 ? atTwo : formatDecimal(a, SCALE);
}
