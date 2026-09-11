const MINOR_UNITS: Readonly<Record<string, number>> = Object.freeze({
  JPY: 0,
  KRW: 0,
  VND: 0,
  CLP: 0,
  ISK: 0,
  UGX: 0,
  XAF: 0,
  XOF: 0,
  KWD: 3,
  BHD: 3,
  OMR: 3,
  JOD: 3,
  TND: 3,
});

const DEFAULT_MINOR_UNITS = 2;

const LOCALE_BY_CURRENCY: Readonly<Record<string, string>> = Object.freeze({
  INR: "en-IN",
  USD: "en-US",
  GBP: "en-GB",
  EUR: "en-IE",
  SGD: "en-SG",
  AUD: "en-AU",
  CAD: "en-CA",
  AED: "en-AE",
  JPY: "ja-JP",
});

export interface MoneyValue {
  minor: number;
  currency: string;
}

export function minorUnitsOf(currency: string): number {
  return MINOR_UNITS[currency.toUpperCase()] ?? DEFAULT_MINOR_UNITS;
}

export function localeFor(currency: string): string {
  return LOCALE_BY_CURRENCY[currency.toUpperCase()] ?? "en-US";
}

export function minorToMajor(minor: number, currency: string): number {
  return minor / 10 ** minorUnitsOf(currency);
}

export function majorToMinor(major: number, currency: string): number {
  return Math.round(major * 10 ** minorUnitsOf(currency));
}

export function formatMinorMoney(
  minor: number,
  currency: string,
  options: { showSymbol?: boolean; signDisplay?: "auto" | "never" | "always" } = {},
): string {
  const scale = minorUnitsOf(currency);
  const { showSymbol = true, signDisplay = "auto" } = options;
  return new Intl.NumberFormat(localeFor(currency), {
    style: showSymbol ? "currency" : "decimal",
    currency: showSymbol ? currency : undefined,
    minimumFractionDigits: scale,
    maximumFractionDigits: scale,
    signDisplay,
  }).format(minorToMajor(minor, currency));
}

export function formatMinorMoneyCompact(minor: number, currency: string): string {
  return new Intl.NumberFormat(localeFor(currency), {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(minorToMajor(minor, currency));
}

export function parseMoneyInput(value: string, currency: string): number | null {
  const cleaned = value.replace(/[\s, ]/g, "").replace(/[^\d.-]/g, "");
  if (!cleaned || !/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  const scale = minorUnitsOf(currency);
  const decimals = cleaned.split(".")[1]?.length ?? 0;
  if (decimals > scale) return null;
  return majorToMinor(parsed, currency);
}

export function moneyInputValue(minor: number | null | undefined, currency: string): string {
  if (minor === null || minor === undefined) return "";
  return minorToMajor(minor, currency).toFixed(minorUnitsOf(currency));
}

export function formatRate(rate: string | number): string {
  const value = typeof rate === "string" ? Number(rate) : rate;
  if (!Number.isFinite(value)) return String(rate);
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

export function formatBasisPoints(rateBp: number): string {
  return `${(rateBp / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}

export function sumMinor(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export type BalanceDirection = "debit" | "credit";

export function balanceDirection(balanceMinor: number): BalanceDirection {
  return balanceMinor >= 0 ? "debit" : "credit";
}

export function formatSignedBalance(balanceMinor: number, currency: string): string {
  return formatMinorMoney(Math.abs(balanceMinor), currency);
}
