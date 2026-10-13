import { calendarSavedViewDefinition, calendarSavedViewFormValues } from "./calendar-saved-view-definition";

const currentDate = new Date("2026-10-13T12:00:00.000Z");

describe("saved calendar view filter definition", () => {
  it("omits cleared filters instead of inheriting a selected view", () => {
    const values = calendarSavedViewFormValues(undefined, 42);
    expect(calendarSavedViewDefinition({ ...values, name: "Clean" }, currentDate, 42)).toEqual({
      dateLogic: { kind: "today" },
      mode: "my-day",
    });
  });

  it("saves every supported My Day filter with a resolved actor owner", () => {
    const values = {
      ...calendarSavedViewFormValues(undefined, 42),
      name: "Follow up",
      sourceKey: "build",
      ownerMembershipId: "me",
      projectId: "15",
      location: "  London  ",
      status: "OPEN",
      actionable: "true" as const,
    };
    expect(calendarSavedViewDefinition(values, currentDate, 42)).toEqual({
      dateLogic: { kind: "today" },
      mode: "my-day",
      sourceKey: "build",
      ownerMembershipId: 42,
      projectId: 15,
      location: "London",
      status: "OPEN",
      actionable: true,
    });
  });

  it("refuses to discard a requested self-owner filter when membership is unavailable", () => {
    const values = { ...calendarSavedViewFormValues(undefined, null), ownerMembershipId: "me" };
    expect(() => calendarSavedViewDefinition(values, currentDate, null)).toThrow("membership is unavailable");
  });
});
