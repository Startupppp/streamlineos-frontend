import { defaultPayrollStartMonth, shiftPastCalendarDate } from "./setup-defaults";
import { orderTemplatesForCountry } from "./template-order";

describe("payroll setup defaults", () => {
  it("starts next month when today is past the 15th, so the tax cutoff is not already past", () => {
    expect(defaultPayrollStartMonth(new Date(2026, 9, 17))).toBe("2026-11");
    expect(defaultPayrollStartMonth(new Date(2026, 9, 15))).toBe("2026-10");
  });

  it("shifts a past cutoff to the next future day and leaves future dates alone", () => {
    const today = new Date(2026, 9, 17);
    expect(shiftPastCalendarDate("2026-10-15", today)).toBe("2026-11-15");
    expect(shiftPastCalendarDate("2026-11-15", today)).toBe("2026-11-15");
  });

  it("lists the selected country's templates before others", () => {
    const ordered = orderTemplatesForCountry(
      [
        { key: "AU_STANDARD", name: "AU Standard Payroll", isRecommended: true },
        { key: "INDIAN_STANDARD", name: "India Standard Payroll", isRecommended: false },
        { key: "INDIAN_STARTUP", name: "India Startup Payroll", isRecommended: true },
      ],
      "IN",
    );
    expect(ordered.map((template) => template.key)).toEqual([
      "INDIAN_STARTUP",
      "INDIAN_STANDARD",
      "AU_STANDARD",
    ]);
  });
});
