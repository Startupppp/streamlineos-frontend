import {
  formatMoney,
  formatMoneyCompact,
  formatCurrencyFull,
  DEFAULT_MONEY_DISPLAY,
  type MoneyDisplay,
} from "@/lib/format-utils";

const INR: MoneyDisplay = { currency: "INR", locale: "en-IN" };
const USD: MoneyDisplay = { currency: "USD", locale: "en-US" };
const EUR: MoneyDisplay = { currency: "EUR", locale: "de-DE" };
const JPY: MoneyDisplay = { currency: "JPY", locale: "ja-JP" };

describe("formatMoney — full precision per locale", () => {
  it("renders INR with ₹ symbol and Indian digit grouping", () => {
    const result = formatMoney(12300000, INR);
    expect(result).toContain("₹");
    expect(result).toContain("1,23,00,000");
  });

  it("renders USD with $ and US grouping", () => {
    const result = formatMoney(12300000, USD);
    expect(result).toContain("$");
    expect(result).toContain("12,300,000");
  });

  it("renders EUR with locale-appropriate format", () => {
    const result = formatMoney(1500, EUR);
    expect(result).toContain("€");
  });

  it("handles null gracefully (returns zero in currency format)", () => {
    const result = formatMoney(null, INR);
    expect(result).toContain("₹");
    expect(result).toContain("0");
  });

  it("handles undefined gracefully", () => {
    const result = formatMoney(undefined, USD);
    expect(result).toContain("$");
  });

  it("handles string numeric values", () => {
    const result = formatMoney("9999.50", INR);
    expect(result).toContain("₹");
  });
});

describe("formatMoneyCompact — compact notation per locale", () => {
  it("uses Indian compact suffixes (L, Cr) for INR", () => {
    expect(formatMoneyCompact(340_000, INR)).toBe("₹3.4L");
    expect(formatMoneyCompact(12_300_000, INR)).toBe("₹1.2Cr");
  });

  it("uses millions notation for USD, not crores", () => {
    const result = formatMoneyCompact(12_300_000, USD);
    expect(result).toContain("M");
    expect(result).not.toContain("Cr");
  });

  it("thousands are K for non-INR locales", () => {
    const result = formatMoneyCompact(340_000, USD);
    expect(result).toContain("K");
    expect(result).not.toContain("L");
  });

  it("does not emit fractional zeros for JPY (zero decimal places)", () => {
    const result = formatMoneyCompact(1000, JPY);
    expect(result).not.toMatch(/\.\d{2}/);
  });
});

describe("formatCurrencyFull — multi-locale precision", () => {
  it("defaults to INR / en-IN when called with no locale args", () => {
    const result = formatCurrencyFull(1500);
    expect(result).toContain("₹");
  });

  it("accepts explicit locale override", () => {
    const result = formatCurrencyFull(1500, "USD", "en-US");
    expect(result).toContain("$");
  });

  it("rounds to 2 decimal places by default", () => {
    const result = formatCurrencyFull(1500.999, "INR", "en-IN");
    expect(result).toContain("1,501.00");
  });

  it("returns zero-formatted string for NaN input", () => {
    const result = formatCurrencyFull(NaN);
    expect(result).toBe("₹0.00");
  });
});

describe("DEFAULT_MONEY_DISPLAY — INR is the platform default", () => {
  it("is INR/en-IN", () => {
    expect(DEFAULT_MONEY_DISPLAY.currency).toBe("INR");
    expect(DEFAULT_MONEY_DISPLAY.locale).toBe("en-IN");
  });

  it("produces the same output as the INR constant", () => {
    const amount = 450_000;
    expect(formatMoneyCompact(amount, DEFAULT_MONEY_DISPLAY)).toBe(
      formatMoneyCompact(amount, INR),
    );
  });
});

describe("BITE PROOF — locale isolation", () => {
  it("would fail if USD used Indian lakh grouping instead of millions", () => {
    const result = formatMoneyCompact(12_300_000, USD);
    expect(result).not.toBe("$1.2Cr");
    expect(result).not.toBe("$123L");
  });
});
