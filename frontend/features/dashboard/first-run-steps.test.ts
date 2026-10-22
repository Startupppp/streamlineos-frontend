import { firstRunRows, type FirstRunSignals } from "./first-run-steps";

const ALL = { holidays: true, leave: true, employees: true, managers: true, template: true, salaries: true, attendance: true, payroll: true };

it("marks the first unfinished step next and keeps the guided order", () => {
  const signals: FirstRunSignals = { holidays: true, leave: false, employees: false, managers: false, template: true, salaries: false, attendance: false, payroll: false };
  const rows = firstRunRows(signals, ALL);
  expect(rows.map((r) => [r.key, r.status])).toEqual([
    ["holidays", "done"],
    ["leave", "next"],
    ["employees", "todo"],
    ["managers", "todo"],
    ["template", "done"],
    ["salaries", "todo"],
    ["attendance", "todo"],
    ["payroll", "todo"],
  ]);
});

it("leaves out steps the user cannot do or whose data they cannot read", () => {
  const signals: FirstRunSignals = { holidays: false, leave: false, employees: false, managers: null, template: false, salaries: false, attendance: false, payroll: false };
  const hrOnly = { ...ALL, template: false, salaries: false, attendance: false, payroll: false };
  expect(firstRunRows(signals, hrOnly).map((r) => r.key)).toEqual(["holidays", "leave", "employees"]);
});
