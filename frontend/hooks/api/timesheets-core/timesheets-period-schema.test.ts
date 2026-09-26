import { DB_ENUMS } from "@/contracts/db-enums.generated";
import { timesheetPeriodContract } from "./timesheets-period-schema";
import { PERIOD_STATUS_BADGE, PERIOD_STATUS_LABEL } from "@/features/timesheets/types";

describe("timesheetPeriodContract — period status field", () => {
  const statusSchema = timesheetPeriodContract.shape.status;
  const schemaMembers: string[] = (statusSchema as { options: string[] }).options;

  it("rejects REOPENED, a timesheet period status no row can hold because timesheet_period_status does not declare it", () => {
    expect(() => statusSchema.parse("REOPENED")).toThrow();
  });

  it("accepts exactly the six members timesheet_period_status declares, so a filter chip cannot be offered for a state that never occurs", () => {
    const sixMembers = DB_ENUMS.timesheet_period_status;
    for (const member of sixMembers) {
      expect(() => statusSchema.parse(member)).not.toThrow();
    }
    expect(schemaMembers.length).toBe(sixMembers.length);
  });

  it("schema member set equals DB_ENUMS.timesheet_period_status exactly, so this cannot drift again", () => {
    const expected = [...DB_ENUMS.timesheet_period_status].sort();
    const actual = [...schemaMembers].sort();
    expect(actual).toEqual(expected);
  });

  it("maps a tone and a label for every one of the six real statuses and for none that do not exist", () => {
    const sixMembers = [...DB_ENUMS.timesheet_period_status].sort();
    expect(Object.keys(PERIOD_STATUS_BADGE).sort()).toEqual(sixMembers);
    expect(Object.keys(PERIOD_STATUS_LABEL).sort()).toEqual(sixMembers);
    for (const member of DB_ENUMS.timesheet_period_status) {
      expect(typeof PERIOD_STATUS_BADGE[member as keyof typeof PERIOD_STATUS_BADGE]).toBe("string");
      expect(typeof PERIOD_STATUS_LABEL[member as keyof typeof PERIOD_STATUS_LABEL]).toBe("string");
    }
  });
});
