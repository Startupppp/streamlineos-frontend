import {
  DEFAULT_MONEY_DISPLAY,
  formatMoney,
  formatMoneyCompact,
  formatINRCompact,
  type MoneyDisplay,
} from "./format-utils";

const INR: MoneyDisplay = { currency: "INR", locale: "en-IN" };
const USD: MoneyDisplay = { currency: "USD", locale: "en-US" };
const JPY: MoneyDisplay = { currency: "JPY", locale: "ja-JP" };

describe("formatMoneyCompact", () => {
  it("groups rupees in lakhs and crores", () => {
    expect(formatMoneyCompact(12_300_000, INR)).toBe("₹1.2Cr");
    expect(formatMoneyCompact(340_000, INR)).toBe("₹3.4L");
    expect(formatMoneyCompact(12_000, INR)).toBe("₹12K");
  });

  it("groups other currencies the way their own readers expect", () => {
    // The whole point: an American tenant is not shown a figure in crores.
    expect(formatMoneyCompact(12_300_000, USD)).toBe("$12.3M");
    expect(formatMoneyCompact(340_000, USD)).toBe("$340K");
  });

  it("matches the INR helper it replaces, so no rupee figure moves", () => {
    for (const amount of [12_300_000, 340_000, 12_000, 99_000_000, 1_500_000, 25_000])
      expect(formatMoneyCompact(amount, INR)).toBe(formatINRCompact(amount));
  });

  it("accepts the decimal string the API sends for a deal value", () => {
    expect(formatMoneyCompact("450000.00", INR)).toBe("₹4.5L");
  });

  it("renders zero rather than an empty string", () => {
    expect(formatMoneyCompact(0, INR)).toBe("₹0");
  });

  it("survives a value that is not a number", () => {
    // A null deal value must not take out every other cell in the row.
    for (const bad of [null, undefined, "", "n/a", NaN])
      expect(formatMoneyCompact(bad as number | string | null, INR)).toBe("₹0");
  });

  it("keeps a negative figure signed", () => {
    expect(formatMoneyCompact(-340_000, INR)).toContain("3.4L");
    expect(formatMoneyCompact(-340_000, INR)).toMatch(/^-/);
  });
});

describe("formatMoney", () => {
  it("renders full precision in the organisation's currency", () => {
    expect(formatMoney(123_456.5, INR)).toBe("₹1,23,456.50");
    expect(formatMoney(123_456.5, USD)).toBe("$123,456.50");
  });

  it("uses the currency's own fraction digits rather than assuming two", () => {
    // Yen has none, so a forced two decimals would render a figure that
    // cannot exist.
    expect(formatMoney(1000, JPY)).not.toContain(".");
  });
});

describe("DEFAULT_MONEY_DISPLAY", () => {
  it("formats without throwing, since it is what renders before the fetch lands", () => {
    expect(() => formatMoneyCompact(1000, DEFAULT_MONEY_DISPLAY)).not.toThrow();
  });
});
