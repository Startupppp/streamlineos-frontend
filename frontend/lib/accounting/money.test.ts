import {
  balanceDirection,
  formatBasisPoints,
  formatMinorMoney,
  majorToMinor,
  minorToMajor,
  minorUnitsOf,
  moneyInputValue,
  parseMoneyInput,
} from "./money";

describe("minor unit scales", () => {
  it("knows zero-, two- and three-decimal currencies", () => {
    expect(minorUnitsOf("JPY")).toBe(0);
    expect(minorUnitsOf("INR")).toBe(2);
    expect(minorUnitsOf("KWD")).toBe(3);
    expect(minorUnitsOf("XYZ")).toBe(2);
  });

  it("round-trips minor and major units", () => {
    expect(minorToMajor(832500, "INR")).toBe(8325);
    expect(majorToMinor(8325, "INR")).toBe(832500);
    expect(minorToMajor(1000, "JPY")).toBe(1000);
    expect(majorToMinor(1.234, "KWD")).toBe(1234);
  });
});

describe("formatting", () => {
  it("renders the right number of decimals per currency", () => {
    expect(formatMinorMoney(832500, "INR")).toContain("8,325.00");
    expect(formatMinorMoney(1000, "JPY")).not.toContain(".");
    expect(formatMinorMoney(1234, "KWD")).toContain("1.234");
  });

  it("formats a basis-point rate as a percentage", () => {
    expect(formatBasisPoints(1800)).toBe("18%");
    expect(formatBasisPoints(250)).toBe("2.5%");
    expect(formatBasisPoints(0)).toBe("0%");
  });

  it("reports which side a balance sits on", () => {
    expect(balanceDirection(100)).toBe("debit");
    expect(balanceDirection(-100)).toBe("credit");
    expect(balanceDirection(0)).toBe("debit");
  });
});

describe("input parsing", () => {
  it("parses a typed amount into minor units", () => {
    expect(parseMoneyInput("8325.00", "INR")).toBe(832500);
    expect(parseMoneyInput("8,325", "INR")).toBe(832500);
    expect(parseMoneyInput("0.05", "INR")).toBe(5);
    expect(parseMoneyInput("1000", "JPY")).toBe(1000);
  });

  it("refuses precision the currency cannot hold", () => {
    expect(parseMoneyInput("10.005", "INR")).toBeNull();
    expect(parseMoneyInput("10.5", "JPY")).toBeNull();
  });

  it("refuses nonsense", () => {
    expect(parseMoneyInput("", "INR")).toBeNull();
    expect(parseMoneyInput("abc", "INR")).toBeNull();
  });

  it("renders a form value at the currency's own scale", () => {
    expect(moneyInputValue(832500, "INR")).toBe("8325.00");
    expect(moneyInputValue(1000, "JPY")).toBe("1000");
    expect(moneyInputValue(null, "INR")).toBe("");
  });
});
