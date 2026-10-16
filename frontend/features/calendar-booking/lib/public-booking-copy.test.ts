import { publicBookingUiLocale } from "./public-booking-copy";

describe("public booking UI locale", () => {
  it("falls back when an approved language has an invalid locale variant", () => {
    for (const locale of ["en-foo", "hi-foo", "te-foo"]) {
      const selected = publicBookingUiLocale(locale);
      expect(selected).toBe("en-US");
      expect(() => new Intl.DateTimeFormat(selected).format(new Date())).not.toThrow();
    }
  });

  it("preserves valid supported English, Hindi, and Telugu locales", () => {
    expect(publicBookingUiLocale("en-GB")).toBe("en-GB");
    expect(publicBookingUiLocale("hi-IN")).toBe("hi-IN");
    expect(publicBookingUiLocale("te-IN")).toBe("te-IN");
  });
});
