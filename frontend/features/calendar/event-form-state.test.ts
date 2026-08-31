import { addHours } from "date-fns";
import {
  getDateTimeError,
  needsEndDateField,
  resolveEventDateTimes,
  toDefaultForm,
} from "./event-form-state";

describe("event form state", () => {
  it("creates a one-hour default slot without an end-date field", () => {
    const start = new Date("2026-08-29T09:00:00");
    const form = toDefaultForm({ start, end: addHours(start, 1) });

    expect(form.startDate).toBe("2026-08-29");
    expect(form.startTime).toBe("09:00");
    expect(needsEndDateField(form)).toBe(false);
  });

  it("requires an end date when the selected range crosses midnight", () => {
    const form = toDefaultForm({
      start: new Date("2026-08-29T23:30:00"),
      end: new Date("2026-08-30T00:30:00"),
    });

    expect(needsEndDateField(form)).toBe(true);
  });

  it("rejects an end before the start", () => {
    const form = {
      ...toDefaultForm(),
      startDate: "2026-08-29",
      startTime: "10:00",
      endDate: "2026-08-29",
      endTime: "09:00",
    };

    expect(getDateTimeError(form, true)).toBe("End must be on or after start");
  });

  it("resolves an all-day range to the complete calendar day", () => {
    const form = { ...toDefaultForm(), allDay: true, startDate: "2026-08-29" };
    const resolved = resolveEventDateTimes(form, false);

    expect(resolved?.start.getHours()).toBe(0);
    expect(resolved?.end.getHours()).toBe(23);
    expect(resolved?.end.getMinutes()).toBe(59);
  });
});
