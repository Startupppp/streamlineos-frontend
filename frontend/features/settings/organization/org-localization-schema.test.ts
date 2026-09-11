import {
  localizationSchema,
  toCurrencyCode,
  extractLocalizationSettings,
  CURRENCY_VALUES,
  TIME_FORMAT_VALUES,
  WEEK_START_DAY_VALUES,
} from "./org-localization-schema";

const BASE = {
  timezone: "Asia/Kolkata",
  currency: "INR",
  fiscalYearStart: 4,
  language: "en",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12h",
  numberFormat: "1,234.56",
  weekStartDay: "monday",
} as const;

describe("organization localization form", () => {
  it("accepts a fully valid payload", () => {
    expect(localizationSchema.safeParse(BASE).success).toBe(true);
  });

  it("rejects a currency not in the allowed enum", () => {
    expect(
      localizationSchema.safeParse({ ...BASE, currency: "XYZ" }).success,
    ).toBe(false);
  });

  it("accepts every declared currency value", () => {
    for (const currency of CURRENCY_VALUES) {
      expect(
        localizationSchema.safeParse({ ...BASE, currency }).success,
      ).toBe(true);
    }
  });

  it("rejects a fiscalYearStart of 0", () => {
    expect(
      localizationSchema.safeParse({ ...BASE, fiscalYearStart: 0 }).success,
    ).toBe(false);
  });

  it("rejects a fiscalYearStart of 13", () => {
    expect(
      localizationSchema.safeParse({ ...BASE, fiscalYearStart: 13 }).success,
    ).toBe(false);
  });

  it("accepts fiscalYearStart at boundary values 1 and 12", () => {
    expect(
      localizationSchema.safeParse({ ...BASE, fiscalYearStart: 1 }).success,
    ).toBe(true);
    expect(
      localizationSchema.safeParse({ ...BASE, fiscalYearStart: 12 }).success,
    ).toBe(true);
  });

  it("rejects an unrecognised timeFormat", () => {
    expect(
      localizationSchema.safeParse({ ...BASE, timeFormat: "am-pm" }).success,
    ).toBe(false);
  });

  it("accepts every declared timeFormat value", () => {
    for (const timeFormat of TIME_FORMAT_VALUES) {
      expect(
        localizationSchema.safeParse({ ...BASE, timeFormat }).success,
      ).toBe(true);
    }
  });

  it("rejects an unrecognised weekStartDay", () => {
    expect(
      localizationSchema.safeParse({ ...BASE, weekStartDay: "friday" }).success,
    ).toBe(false);
  });

  it("accepts every declared weekStartDay value", () => {
    for (const weekStartDay of WEEK_START_DAY_VALUES) {
      expect(
        localizationSchema.safeParse({ ...BASE, weekStartDay }).success,
      ).toBe(true);
    }
  });

  it("rejects an empty timezone", () => {
    expect(
      localizationSchema.safeParse({ ...BASE, timezone: "" }).success,
    ).toBe(false);
  });
});

describe("toCurrencyCode", () => {
  it("returns the matching currency for a known value", () => {
    expect(toCurrencyCode("USD")).toBe("USD");
  });

  it("falls back to INR for an unknown value", () => {
    expect(toCurrencyCode("XYZ")).toBe("INR");
  });

  it("falls back to INR for null", () => {
    expect(toCurrencyCode(null)).toBe("INR");
  });
});

describe("extractLocalizationSettings", () => {
  it("returns defaults when settings is null", () => {
    const result = extractLocalizationSettings(null);
    expect(result.language).toBe("en");
    expect(result.dateFormat).toBe("DD/MM/YYYY");
    expect(result.timeFormat).toBe("12h");
    expect(result.weekStartDay).toBe("monday");
  });

  it("extracts known values from a settings record", () => {
    const result = extractLocalizationSettings({
      language: "fr",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "24h",
      numberFormat: "1.234,56",
      weekStartDay: "sunday",
    });
    expect(result.language).toBe("fr");
    expect(result.timeFormat).toBe("24h");
    expect(result.weekStartDay).toBe("sunday");
  });

  it("falls back to defaults for an unrecognised timeFormat", () => {
    const result = extractLocalizationSettings({ timeFormat: "am-pm" });
    expect(result.timeFormat).toBe("12h");
  });
});
