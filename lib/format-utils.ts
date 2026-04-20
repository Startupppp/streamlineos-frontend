import { format } from "date-fns";

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
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

export function formatNumber(value: number, decimals?: number): string {
  if (decimals !== undefined) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return value.toLocaleString();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function capitalise(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function titleCase(str: string): string {
  if (!str) return str;
  return str
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
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
    const date = typeof time === "string" ? new Date(`1970-01-01T${time}`) : time;
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


export function formatDealId(id: number): string {
  return `DEAL-${id.toString().padStart(4, "0")}`;
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

export function formatHoursMinutes(hours: string | number | null | undefined): string {
  if (hours === null || hours === undefined) return "0h 00m";
  const num = typeof hours === "string" ? parseFloat(hours) : hours;
  if (Number.isNaN(num)) return "0h 00m";
  const h = Math.floor(num);
  const m = Math.round((num - h) * 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
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
): string {
  const name = session?.user?.name;
  const email = session?.user?.email;
  const userName = name || (email && email.includes("@") ? email.split("@")[0] : null) || "User";
  return userName.split(" ")[0] || "User";
}
