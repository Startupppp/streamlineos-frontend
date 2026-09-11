import { format } from "date-fns";

export function formatCurrency(value: number): string {
  return formatINRCompact(value);
}

export function formatCurrencyForBilling(amount: number, currency: string): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyFull(
  amount: number | string,
  currency: string = "INR",
  locale: string = "en-IN",
  maximumFractionDigits: number = 2,
): string {
  const num = Number(amount);
  if (Number.isNaN(num)) return currency === "INR" ? "₹0.00" : "0.00";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(num);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export const getInitials = (
  name: string | null | undefined,
  firstName?: string | null,
  lastName?: string | null,
): string => {
  if (firstName?.trim() && lastName?.trim()) {
    return `${firstName.trim()[0]}${lastName.trim()[0]}`.toUpperCase();
  }
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : trimmed.substring(0, 2).toUpperCase();
  }
  return "??";
};

export const formatTime = (time: string | Date | null | undefined): string => {
  if (!time) return "";
  try {
    let date: Date;
    if (time instanceof Date) {
      date = time;
    } else if (/[T ]|Z|\d{4}-\d{2}-\d{2}/.test(time)) {
      date = new Date(time);
    } else {
      date = new Date(`1970-01-01T${time}`);
    }
    if (isNaN(date.getTime())) return String(time);
    return format(date, "hh:mm a");
  } catch {
    return String(time);
  }
};

export const safeMax = (values: number[], fallback = 1): number => {
  if (values.length === 0) return fallback;
  const max = values.reduce((a, b) => Math.max(a, b), -Infinity);
  return max > 0 ? max : fallback;
};

export function formatDayCount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export const calcPercent = (value: number, total: number, decimals = 1): string => {
  if (total <= 0) return "0";
  return ((value / total) * 100).toFixed(decimals);
};
export function formatINR(amount: string | number): string {
  const num = Number(amount);
  if (Number.isNaN(num)) return "₹0";

  const hasPaisa = num % 1 !== 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: hasPaisa ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatINRCompact(amount: string | number): string {
  const num = Number(amount);
  if (Number.isNaN(num)) return "₹0";
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 1_00_00_000) {
    const val = abs / 1_00_00_000;
    return `${sign}₹${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}Cr`;
  }
  if (abs >= 1_00_000) {
    const val = abs / 1_00_000;
    return `${sign}₹${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}L`;
  }
  if (abs >= 10_000) {
    const val = abs / 1_000;
    return `${sign}₹${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}K`;
  }
  const hasPaisa = abs % 1 !== 0;
  return `${sign}₹${new Intl.NumberFormat("en-IN", { minimumFractionDigits: hasPaisa ? 2 : 0, maximumFractionDigits: 2 }).format(abs)}`;
}


export interface MoneyDisplay {
  currency: string;
  locale: string;
}

export const DEFAULT_MONEY_DISPLAY: MoneyDisplay = { currency: "INR", locale: "en-IN" };

function toAmount(value: number | string | null | undefined): number {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function formatMoney(
  value: number | string | null | undefined,
  display: MoneyDisplay,
): string {
  return new Intl.NumberFormat(display.locale, {
    style: "currency",
    currency: display.currency,
  }).format(toAmount(value));
}

export function formatMoneyCompact(
  value: number | string | null | undefined,
  display: MoneyDisplay,
): string {
  return new Intl.NumberFormat(display.locale, {
    style: "currency",
    currency: display.currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(toAmount(value));
}

const numberFormats = new Map<string, Intl.NumberFormat>();

function cachedNumberFormat(
  locale: string | undefined,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  const cached = numberFormats.get(key);
  if (cached) return cached;
  const created = new Intl.NumberFormat(locale, options);
  numberFormats.set(key, created);
  return created;
}

export function formatDecimal(
  value: number | Intl.StringNumericLiteral,
  maximumFractionDigits: number,
  locale?: string,
): string {
  return cachedNumberFormat(locale, { maximumFractionDigits }).format(value);
}

export function formatMoneyRounded(
  amount: number,
  display: MoneyDisplay,
  maximumFractionDigits: number,
): string {
  return cachedNumberFormat(display.locale, {
    style: "currency",
    currency: display.currency,
    maximumFractionDigits,
  }).format(amount);
}

export function formatRatioAsPercent(
  ratio: number,
  locale: string,
  maximumFractionDigits: number,
): string {
  return cachedNumberFormat(locale, { style: "percent", maximumFractionDigits }).format(ratio);
}

export function formatDealId(id: number): string {
  return `DEAL-${id.toString().padStart(4, "0")}`;
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatPercent(value: number, locale: string): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)}%`;
}

export function numberToWords(num: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (num === 0) return "Zero";

  const convertLessThanThousand = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convertLessThanThousand(n % 100) : "");
  };

  if (num < 1000) return convertLessThanThousand(num);
  if (num < 100000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    return convertLessThanThousand(thousands) + " Thousand" + (remainder ? " " + convertLessThanThousand(remainder) : "");
  }
  if (num < 10000000) {
    const lakhs = Math.floor(num / 100000);
    const remainder = num % 100000;
    return convertLessThanThousand(lakhs) + " Lakh" + (remainder ? " " + numberToWords(remainder) : "");
  }
  const crores = Math.floor(num / 10000000);
  const remainder = num % 10000000;
  return convertLessThanThousand(crores) + " Crore" + (remainder ? " " + numberToWords(remainder) : "");
}

const GREETING_AFTERNOON_HOUR = 12;
const GREETING_EVENING_HOUR = 17;

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < GREETING_AFTERNOON_HOUR) return "Good morning";
  if (hour < GREETING_EVENING_HOUR) return "Good afternoon";
  return "Good evening";
}

export function getFirstName(
  session: { user?: { name?: string | null; email?: string | null } } | null,
): string | null {
  const name = session?.user?.name?.trim() ?? "";
  if (!name) return null;
  const emailLocal =
    session?.user?.email?.trim().split("@")[0]?.trim().toLowerCase() ?? "";
  if (emailLocal && name.toLowerCase() === emailLocal) return null;
  const first = name.split(/\s+/)[0] ?? "";
  if (!first) return null;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function formatIpAddress(ip: string | null | undefined): string {
  if (!ip) return "—";
  if (ip === "::1" || ip === "127.0.0.1") return "Local network";
  if (/^10\./.test(ip)) return "Local network";
  if (/^192\.168\./.test(ip)) return "Local network";
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return "Local network";
  if (/^(fc|fd)/i.test(ip)) return "Local network";
  if (/^fe80:/i.test(ip)) return "Local network";
  return ip;
}

export function formatClientDeviceLabel(device: {
  browser: string | null | undefined;
  os?: string | null;
  platform?: string | null;
}): string {
  const browser = device.browser?.trim() || "Unknown";
  if (device.os?.trim()) return `${browser} · ${device.os.trim()}`;
  if (device.platform?.trim()) return `${browser} · ${device.platform.trim()}`;
  return browser;
}
