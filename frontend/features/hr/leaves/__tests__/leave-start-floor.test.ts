import { leaveStartFloor } from "@/features/hr/leaves/leave-date-helpers";

const TODAY = new Date(2026, 9, 14);

describe("leaveStartFloor (QA 2026-10-14: backdated leave was impossible for HR)", () => {
  it("lets HR pick past dates back to 1 January of the balance year when no joining date is known", () => {
    expect(leaveStartFloor(undefined, true, TODAY)).toEqual(new Date(2026, 0, 1));
  });

  it("floors HR at the employee's joining date", () => {
    const joined = new Date(2025, 5, 2);
    expect(leaveStartFloor(joined, true, TODAY)).toEqual(joined);
  });

  it("keeps an employee at today even when they joined long ago", () => {
    expect(leaveStartFloor(new Date(2024, 0, 1), false, TODAY)).toEqual(TODAY);
    expect(leaveStartFloor(undefined, false, TODAY)).toEqual(TODAY);
  });

  it("keeps a future joiner at their joining date", () => {
    const joins = new Date(2026, 10, 1);
    expect(leaveStartFloor(joins, false, TODAY)).toEqual(joins);
  });
});
