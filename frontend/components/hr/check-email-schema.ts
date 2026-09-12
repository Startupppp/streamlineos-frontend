import { z } from "zod";

export const EMPLOYEE_ADMISSION_STATUSES = [
  "available",
  "member-without-employment",
  "employee",
  "archived-member",
] as const;

export const checkEmailContract = z.object({
  exists: z.boolean(),
  status: z.enum(EMPLOYEE_ADMISSION_STATUSES),
  memberStatus: z.enum(["SUSPENDED", "LEFT"]).nullable(),
});

export type EmployeeAdmissionCheck = z.infer<typeof checkEmailContract>;
export type EmployeeAdmissionStatus = EmployeeAdmissionCheck["status"];
