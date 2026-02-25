import { format } from "date-fns";

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
