import {
  BUSINESS_DAYS,
  DEFAULT_BUSINESS_HOURS,
  businessHoursSchema,
  mergeBusinessHours,
} from "./org-business-hours-schema";

describe("businessHoursSchema", () => {
  it("accepts the shipped defaults", () => {
    expect(businessHoursSchema.safeParse(DEFAULT_BUSINESS_HOURS).success).toBe(true);
  });

  it("requires every day of the week", () => {
    const { sunday: _sunday, ...withoutSunday } = DEFAULT_BUSINESS_HOURS;
    expect(businessHoursSchema.safeParse(withoutSunday).success).toBe(false);
  });

  it("rejects an empty time, which is what a cleared time input emits", () => {
    const result = businessHoursSchema.safeParse({
      ...DEFAULT_BUSINESS_HOURS,
      monday: { open: "", close: "18:00", enabled: true },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe("Enter a valid time");
  });

  it("rejects an out-of-range hour and an out-of-range minute", () => {
    expect(
      businessHoursSchema.safeParse({
        ...DEFAULT_BUSINESS_HOURS,
        monday: { open: "24:00", close: "18:00", enabled: true },
      }).success,
    ).toBe(false);
    expect(
      businessHoursSchema.safeParse({
        ...DEFAULT_BUSINESS_HOURS,
        monday: { open: "09:60", close: "18:00", enabled: true },
      }).success,
    ).toBe(false);
  });

  it("accepts the boundary times 00:00 and 23:59", () => {
    expect(
      businessHoursSchema.safeParse({
        ...DEFAULT_BUSINESS_HOURS,
        monday: { open: "00:00", close: "23:59", enabled: true },
      }).success,
    ).toBe(true);
  });

  it("rejects a non-boolean enabled flag", () => {
    expect(
      businessHoursSchema.safeParse({
        ...DEFAULT_BUSINESS_HOURS,
        monday: { open: "09:00", close: "18:00", enabled: "yes" },
      }).success,
    ).toBe(false);
  });
});

describe("mergeBusinessHours", () => {
  it("returns the defaults when nothing is saved", () => {
    expect(mergeBusinessHours(null)).toEqual(DEFAULT_BUSINESS_HOURS);
    expect(mergeBusinessHours(undefined)).toEqual(DEFAULT_BUSINESS_HOURS);
  });

  it("keeps defaults for days the server did not send", () => {
    const merged = mergeBusinessHours({
      monday: { open: "10:00", close: "19:00", enabled: true },
    });
    expect(merged.monday).toEqual({ open: "10:00", close: "19:00", enabled: true });
    expect(merged.sunday).toEqual(DEFAULT_BUSINESS_HOURS.sunday);
  });

  it("coerces a stored time that is not HH:mm back to that day's default", () => {
    const merged = mergeBusinessHours({
      monday: { open: "", close: "9am", enabled: true },
      saturday: { open: "25:00", close: "14:00", enabled: true },
    });
    expect(merged.monday.open).toBe(DEFAULT_BUSINESS_HOURS.monday.open);
    expect(merged.monday.close).toBe(DEFAULT_BUSINESS_HOURS.monday.close);
    expect(merged.saturday.open).toBe(DEFAULT_BUSINESS_HOURS.saturday.open);
    expect(merged.saturday.close).toBe("14:00");
  });

  it("always produces a form seed the schema accepts", () => {
    const merged = mergeBusinessHours({
      monday: { open: "nonsense", close: "", enabled: true },
    });
    expect(businessHoursSchema.safeParse(merged).success).toBe(true);
  });

  it("ignores day keys the product does not model", () => {
    const merged = mergeBusinessHours({
      caturday: { open: "10:00", close: "11:00", enabled: true },
    });
    expect(merged).toEqual(DEFAULT_BUSINESS_HOURS);
  });

  it("covers all seven days, in week order", () => {
    expect(BUSINESS_DAYS.map((d) => d.key)).toEqual([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]);
  });
});
