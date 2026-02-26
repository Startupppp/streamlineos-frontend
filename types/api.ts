import { type RouterOutputs } from "../server/api/root";
export type AttendanceStatus =
  RouterOutputs["hr"]["getAttendanceStatus"]["status"];
export type AttendanceLog =
  RouterOutputs["hr"]["getAttendanceStatus"]["logs"][number];
export type TodayLog = RouterOutputs["hr"]["getAttendanceStatus"]["todayLog"];

export type LeaveBalance = RouterOutputs["hr"]["getLeaves"]["balances"][number];
export type LeaveType = RouterOutputs["hr"]["getLeaves"]["types"][number];
export type LeaveRequest = RouterOutputs["hr"]["getLeaves"]["requests"][number];

export type Payroll = RouterOutputs["hr"]["getPayrolls"][number];
export type Department = RouterOutputs["hr"]["getDepartments"][number];
export type Project = RouterOutputs["project"]["getProjects"][number];
export type ProjectDetails = RouterOutputs["project"]["getProjectDetails"];
export type Ticket = NonNullable<ProjectDetails>["tickets"][number];
export type DashboardStats = RouterOutputs["dashboard"]["getStats"];
