import {
  formatMoney,
  formatMoneyCompact,
  formatCurrencyFull,
  formatCurrencyForBilling,
  formatINR,
  formatINRCompact,
  formatNumber,
  formatPercent,
  formatDecimal,
  formatMoneyRounded,
  formatRatioAsPercent,
  DEFAULT_MONEY_DISPLAY,
} from "./format-utils";

describe("formatMoney — canonical multi-currency formatter", () => {
  const INR = { currency: "INR", locale: "en-IN" };
  const USD = { currency: "USD", locale: "en-US" };
  const EUR = { currency: "EUR", locale: "de-DE" };

  it("formats a positive INR amount with the currency symbol and two decimals", () => {
    expect(formatMoney(1234.5, INR)).toContain("1,234");
  });

  it("formats zero as the currency unit with no error", () => {
    const result = formatMoney(0, INR);
    expect(result).toBeTruthy();
    expect(result).toContain("0");
  });

  it("formats a negative amount without throwing", () => {
    const result = formatMoney(-500, INR);
    expect(result).toContain("500");
  });

  it("formats a large amount without throwing", () => {
    const result = formatMoney(10_00_00_000, INR);
    expect(result).toBeTruthy();
  });

  it("formats USD with the $ symbol", () => {
    const result = formatMoney(99.99, USD);
    expect(result).toContain("99");
    expect(result).toMatch(/\$/);
  });

  it("formats EUR with the euro symbol", () => {
    const result = formatMoney(50, EUR);
    expect(result).toContain("50");
    expect(result).toMatch(/€/);
  });

  it("accepts a string amount without throwing", () => {
    expect(() => formatMoney("500.00", INR)).not.toThrow();
  });

  it("returns a defined, non-empty string for null input", () => {
    const result = formatMoney(null, INR);
    expect(result).toBeTruthy();
  });
});

describe("formatMoneyCompact — compact notation for stats and dense cells", () => {
  const INR = { currency: "INR", locale: "en-IN" };
  const USD = { currency: "USD", locale: "en-US" };

  it("uses compact notation for large values", () => {
    const result = formatMoneyCompact(1_000_000, USD);
    expect(result).toMatch(/M|million/i);
  });

  it("formats zero without throwing", () => {
    expect(() => formatMoneyCompact(0, INR)).not.toThrow();
  });

  it("formats negative values without throwing", () => {
    const result = formatMoneyCompact(-2500, USD);
    expect(result).toContain("2");
  });

  it("returns a defined, non-empty string for undefined input", () => {
    const result = formatMoneyCompact(undefined, INR);
    expect(result).toBeTruthy();
  });
});

describe("formatCurrencyFull — full-precision formatter", () => {
  it("formats INR by default with the rupee sign", () => {
    const result = formatCurrencyFull(1000);
    expect(result).toContain("1,000");
    expect(result).toMatch(/₹|INR/);
  });

  it("formats USD when currency and locale are supplied", () => {
    const result = formatCurrencyFull(250.5, "USD", "en-US");
    expect(result).toContain("250");
  });

  it("handles a string amount", () => {
    const result = formatCurrencyFull("750", "INR", "en-IN");
    expect(result).toContain("750");
  });

  it("returns a safe fallback for NaN input", () => {
    const result = formatCurrencyFull(NaN);
    expect(result).toBeTruthy();
  });

  it("respects a large maximumFractionDigits by showing extra precision", () => {
    const result = formatCurrencyFull(1234.5678, "USD", "en-US", 4);
    expect(result).toContain("5678");
  });
});

describe("formatCurrencyForBilling — billing-only formatter", () => {
  it("formats with two decimal places always", () => {
    const result = formatCurrencyForBilling(100, "USD");
    expect(result).toMatch(/100\.00/);
  });

  it("formats zero as a two-decimal amount", () => {
    const result = formatCurrencyForBilling(0, "EUR");
    expect(result).toMatch(/0\.00/);
  });
});

describe("formatINR — legacy INR full formatter", () => {
  it("formats a round rupee amount without paise", () => {
    const result = formatINR(1000);
    expect(result).toContain("1,000");
    expect(result).toMatch(/₹/);
  });

  it("formats an amount with paise including two decimal places", () => {
    const result = formatINR(999.5);
    expect(result).toContain("999");
  });

  it("returns a safe fallback for NaN", () => {
    const result = formatINR(NaN);
    expect(result).toBe("₹0");
  });
});

describe("formatINRCompact — legacy INR compact formatter", () => {
  it("formats crore-range values with Cr suffix", () => {
    const result = formatINRCompact(1_00_00_000);
    expect(result).toContain("Cr");
    expect(result).toMatch(/₹/);
  });

  it("formats lakh-range values with L suffix", () => {
    const result = formatINRCompact(5_00_000);
    expect(result).toContain("L");
  });

  it("formats thousand-range values with K suffix", () => {
    const result = formatINRCompact(50_000);
    expect(result).toContain("K");
  });

  it("formats negative large values with the correct sign", () => {
    const result = formatINRCompact(-1_00_00_000);
    expect(result).toContain("-");
    expect(result).toContain("Cr");
  });

  it("returns a safe fallback for NaN", () => {
    const result = formatINRCompact(NaN);
    expect(result).toBe("₹0");
  });
});

describe("formatNumber — plain locale-aware number formatter", () => {
  it("formats a number with en-IN grouping", () => {
    const result = formatNumber(1234567, "en-IN");
    expect(result).toContain("12,34,567");
  });

  it("formats a number with en-US grouping", () => {
    const result = formatNumber(1234567, "en-US");
    expect(result).toContain("1,234,567");
  });

  it("formats zero without throwing", () => {
    expect(formatNumber(0, "en-IN")).toBe("0");
  });

  it("formats a negative number without throwing", () => {
    const result = formatNumber(-999, "en-IN");
    expect(result).toContain("999");
    expect(result).toContain("-");
  });

  it("formats a decimal number", () => {
    const result = formatNumber(12.5, "en-US");
    expect(result).toContain("12.5");
  });
});

describe("formatPercent — locale-aware percentage formatter", () => {
  it("appends a percent sign", () => {
    expect(formatPercent(42, "en-IN")).toMatch(/%/);
  });

  it("renders up to one decimal place", () => {
    expect(formatPercent(12.456, "en-US")).toBe("12.5%");
  });

  it("renders a round number without trailing decimal", () => {
    expect(formatPercent(60, "en-US")).toBe("60%");
  });

  it("formats zero as 0%", () => {
    expect(formatPercent(0, "en-IN")).toBe("0%");
  });

  it("formats a negative percentage without throwing", () => {
    const result = formatPercent(-5.5, "en-US");
    expect(result).toContain("%");
    expect(result).toContain("5");
  });
});

describe("formatDecimal — capped fraction digits, exact decimal strings", () => {
  it("matches the default-locale formatters it replaced", () => {
    expect(formatDecimal(15651.6, 0)).toBe((15651.6).toLocaleString(undefined, { maximumFractionDigits: 0 }));
    expect(formatDecimal(1234.5678, 2)).toBe((1234.5678).toLocaleString(undefined, { maximumFractionDigits: 2 }));
  });

  it("formats a numeric(18,4) string exactly, without a float round trip", () => {
    const exact: Intl.StringNumericLiteral = "12345678901234.5678";
    expect(formatDecimal(exact, 4, "en-IN")).toBe("1,23,45,67,89,01,234.5678");
    expect(formatDecimal(Number(exact), 4, "en-IN")).not.toBe("1,23,45,67,89,01,234.5678");
  });
});

describe("formatMoneyRounded — currency capped at N fraction digits", () => {
  it("renders whole rupees as the inventory stock-value formatter did", () => {
    const wholeRupees: Intl.NumberFormatOptions = {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    };
    expect(formatMoneyRounded(1234567.89, DEFAULT_MONEY_DISPLAY, 0)).toBe((1234567.89).toLocaleString("en-IN", wholeRupees));
    expect(formatMoneyRounded(1234567.89, DEFAULT_MONEY_DISPLAY, 0)).toBe("₹12,34,568");
  });

  it("keeps two places when asked", () => {
    expect(formatMoneyRounded(12.5, { currency: "USD", locale: "en-US" }, 2)).toBe("$12.50");
  });

  it("throws on an unknown currency code, so a caller's fallback still runs", () => {
    expect(() => formatMoneyRounded(1, { currency: "NOT-A-CODE", locale: "en" }, 2)).toThrow(RangeError);
  });
});

describe("formatRatioAsPercent — Intl percent style", () => {
  it("matches the basis-point formatter it replaced", () => {
    expect(formatRatioAsPercent(0.125, "de-DE", 0)).toBe((0.125).toLocaleString("de-DE", { style: "percent", maximumFractionDigits: 0 }));
    expect(formatRatioAsPercent(0.125, "en-IN", 0)).toBe("13%");
  });
});
