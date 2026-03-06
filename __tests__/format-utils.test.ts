import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatNumber,
  getInitials,
  formatTime,
  safeMax,
  calcPercent,
  formatINR,
  numberToWords,
  formatHoursMinutes,
  getFirstName,
} from "@/lib/format-utils";

describe("formatCurrency", () => {
  it("formats millions", () => {
    expect(formatCurrency(1_500_000)).toBe("$1.50M");
    expect(formatCurrency(1_000_000)).toBe("$1.00M");
  });

  it("formats thousands", () => {
    expect(formatCurrency(5_000)).toBe("$5.0K");
    expect(formatCurrency(1_000)).toBe("$1.0K");
  });

  it("formats small values", () => {
    expect(formatCurrency(500)).toBe("$500");
    expect(formatCurrency(0)).toBe("$0");
  });
});

describe("formatNumber", () => {
  it("formats with locale separators", () => {
    expect(formatNumber(1000)).toMatch(/1.?000/);
    expect(formatNumber(0)).toBe("0");
  });
});

describe("getInitials", () => {
  it("returns initials from firstName + lastName", () => {
    expect(getInitials(null, "John", "Doe")).toBe("JD");
  });

  it("returns initials from full name", () => {
    expect(getInitials("Jane Smith")).toBe("JS");
  });

  it("returns first two chars for single name", () => {
    expect(getInitials("Alice")).toBe("AL");
  });

  it("returns ?? for null/undefined", () => {
    expect(getInitials(null)).toBe("??");
    expect(getInitials(undefined)).toBe("??");
    expect(getInitials("")).toBe("??");
  });
});

describe("formatTime", () => {
  it("returns empty string for null/undefined", () => {
    expect(formatTime(null)).toBe("");
    expect(formatTime(undefined)).toBe("");
  });

  it("formats time string", () => {
    const result = formatTime("14:30:00");
    expect(result).toMatch(/02:30\s?PM/i);
  });

  it("handles Date objects", () => {
    const date = new Date("2026-01-01T09:15:00");
    const result = formatTime(date);
    expect(result).toMatch(/09:15\s?AM/i);
  });
});

describe("safeMax", () => {
  it("returns max from array", () => {
    expect(safeMax([1, 5, 3])).toBe(5);
  });

  it("returns fallback for empty array", () => {
    expect(safeMax([])).toBe(1);
    expect(safeMax([], 10)).toBe(10);
  });

  it("returns fallback when max is 0 or negative", () => {
    expect(safeMax([0, -1, -5])).toBe(1);
  });
});

describe("calcPercent", () => {
  it("calculates percentage", () => {
    expect(calcPercent(25, 100)).toBe("25.0");
    expect(calcPercent(1, 3)).toBe("33.3");
  });

  it("returns 0 for zero total", () => {
    expect(calcPercent(5, 0)).toBe("0");
    expect(calcPercent(5, -1)).toBe("0");
  });

  it("respects decimals parameter", () => {
    expect(calcPercent(1, 3, 2)).toBe("33.33");
  });
});

describe("formatINR", () => {
  it("formats Indian rupee currency", () => {
    const result = formatINR(50000);
    expect(result).toContain("50,000");
  });

  it("handles string input", () => {
    const result = formatINR("100000");
    expect(result).toContain("1,00,000");
  });

  it("returns ₹0 for NaN", () => {
    expect(formatINR("invalid")).toBe("₹0");
  });
});

describe("numberToWords", () => {
  it("converts zero", () => {
    expect(numberToWords(0)).toBe("Zero");
  });

  it("converts ones and teens", () => {
    expect(numberToWords(5)).toBe("Five");
    expect(numberToWords(15)).toBe("Fifteen");
  });

  it("converts tens", () => {
    expect(numberToWords(42)).toBe("Forty Two");
  });

  it("converts hundreds", () => {
    expect(numberToWords(123)).toBe("One Hundred and Twenty Three");
  });

  it("converts thousands (Indian)", () => {
    expect(numberToWords(5000)).toBe("Five Thousand");
    expect(numberToWords(12345)).toBe("Twelve Thousand Three Hundred and Forty Five");
  });

  it("converts lakhs", () => {
    expect(numberToWords(100000)).toBe("One Lakh");
  });

  it("converts crores", () => {
    expect(numberToWords(10000000)).toBe("One Crore");
  });
});

describe("formatHoursMinutes", () => {
  it("formats hours and minutes", () => {
    expect(formatHoursMinutes(8.5)).toBe("8h 30m");
    expect(formatHoursMinutes(0)).toBe("0h 00m");
  });

  it("handles string input", () => {
    expect(formatHoursMinutes("3.25")).toBe("3h 15m");
  });

  it("handles null/undefined", () => {
    expect(formatHoursMinutes(null)).toBe("0h 00m");
    expect(formatHoursMinutes(undefined)).toBe("0h 00m");
  });

  it("handles NaN", () => {
    expect(formatHoursMinutes("abc")).toBe("0h 00m");
  });
});

describe("getFirstName", () => {
  it("extracts first name from session", () => {
    expect(getFirstName({ user: { name: "John Doe", email: "john@test.com" } })).toBe("John");
  });

  it("falls back to email username", () => {
    expect(getFirstName({ user: { name: null, email: "jane@test.com" } })).toBe("jane");
  });

  it("returns User for null session", () => {
    expect(getFirstName(null)).toBe("User");
  });
});
