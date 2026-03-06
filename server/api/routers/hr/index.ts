import { mergeRouters } from "../../trpc";
import { employeeRouter } from "./employee";
import { attendanceRouter } from "./attendance";
import { leaveRouter } from "./leave";
import { payrollRouter } from "./payroll";
import { expenseRouter } from "./expense";
import { documentRouter } from "./document";
import { performanceRouter } from "./performance";
import { helpdeskRouter } from "./helpdesk";
import { workLogRouter } from "./work-log";

export const hrRouter = mergeRouters(
  employeeRouter,
  attendanceRouter,
  leaveRouter,
  payrollRouter,
  expenseRouter,
  documentRouter,
  performanceRouter,
  helpdeskRouter,
  workLogRouter,
);
