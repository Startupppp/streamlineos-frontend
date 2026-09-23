import {
  rosterEntryPayload,
  rosterEntrySchema,
  emptyRosterEntry,
} from "./assign-roster-entry-schema";

describe("roster assignment sends what POST /hr/rosters/:id/entries models, which the UI previously never called at all", () => {
  it("sends the shift as a number, because the select holds it as a string", () => {
    expect(
      rosterEntryPayload({
        ...emptyRosterEntry,
        userId: "u1",
        date: "2026-09-28",
        shiftId: "4",
      }),
    ).toEqual({ userId: "u1", date: "2026-09-28", shiftId: 4 });
  });

  it("sends a day off without a shift, which the backend marks optional", () => {
    expect(
      rosterEntryPayload({
        ...emptyRosterEntry,
        userId: "u1",
        date: "2026-09-28",
        shiftId: "4",
        isDayOff: true,
      }),
    ).toEqual({ userId: "u1", date: "2026-09-28", isDayOff: true });
  });

  it("omits an unchosen shift rather than sending NaN", () => {
    const payload = rosterEntryPayload({
      ...emptyRosterEntry,
      userId: "u1",
      date: "2026-09-28",
    });

    expect(payload).toEqual({ userId: "u1", date: "2026-09-28" });
    expect("shiftId" in payload).toBe(false);
  });

  it("omits blank notes instead of sending an empty string", () => {
    expect(
      rosterEntryPayload({
        ...emptyRosterEntry,
        userId: "u1",
        date: "2026-09-28",
        notes: "   ",
      }),
    ).toEqual({ userId: "u1", date: "2026-09-28" });
  });

  it("refuses a row with nobody on it", () => {
    const parsed = rosterEntrySchema.safeParse({
      ...emptyRosterEntry,
      date: "2026-09-28",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("Choose who is working");
  });
});
