import { leaveTypeSchema } from "./leave-type-schema";

function issues(values: { name: string; daysPerYear: string; carryForward: boolean }): string[] {
  const result = leaveTypeSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`);
}

describe("a blank leave type submit says what is missing, field by field", () => {
  it("reports the missing name on its own field and accepts the default twelve days", () => {
    expect(issues({ name: "", daysPerYear: "12", carryForward: false })).toEqual(["name: Name is required"]);
  });

  it("bounds days per year to a whole number between 0 and 365", () => {
    expect(issues({ name: "Sick leave", daysPerYear: "", carryForward: false })).toEqual(["daysPerYear: Days per year is required"]);
    expect(issues({ name: "Sick leave", daysPerYear: "1.5", carryForward: false })).toEqual(["daysPerYear: Days per year must be a whole number"]);
    expect(issues({ name: "Sick leave", daysPerYear: "366", carryForward: false })).toEqual(["daysPerYear: Days per year must be between 0 and 365"]);
    expect(issues({ name: "Sick leave", daysPerYear: "0", carryForward: true })).toEqual([]);
  });
});
