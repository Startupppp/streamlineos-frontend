import { format } from "date-fns";

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString();
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

/**
 * Format a number as Indian Rupees (₹).
 * Handles string | number input; returns "₹0" for NaN.
 */
export function formatINR(amount: string | number): string {
  const num = Number(amount);
  if (Number.isNaN(num)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Convert a number to Indian-English words (supports up to Crores).
 */
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
): string {
  const name = session?.user?.name;
  const email = session?.user?.email;
  const userName = name || (email && email.includes("@") ? email.split("@")[0] : null) || "User";
  return userName.split(" ")[0] || "User";
}
