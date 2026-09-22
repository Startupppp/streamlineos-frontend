import { z } from "zod";

const managerStateContract = z.enum(["active", "on-notice", "inactive", "exited"]);

const reportingLineEntryContract = z.object({
  lineId: z.number().int(),
  managerUserId: z.string().nullable(),
  managerName: z.string().nullable(),
  managerEmail: z.string().nullable(),
  managerDesignation: z.string().nullable(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  recordedAt: z.string(),
  recordedBy: z.string().nullable(),
  managerState: managerStateContract,
});

export const reportingLineViewContract = z.object({
  userId: z.string(),
  current: reportingLineEntryContract.nullable(),
  upcoming: z.array(reportingLineEntryContract),
  history: z.array(reportingLineEntryContract),
});

export const managerCoverageReportContract = z.object({
  generatedAt: z.string(),
  spanOfControlLimit: z.number().int(),
  summary: z.object({
    employees: z.number().int(),
    withManager: z.number().int(),
    withoutManager: z.number().int(),
    inactiveManager: z.number().int(),
    circular: z.number().int(),
    overSpan: z.number().int(),
  }),
  withoutManager: z.array(
    z.object({
      userId: z.string().nullable(),
      employmentId: z.number().int(),
      employeeNumber: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      designation: z.string().nullable(),
      departmentId: z.string().nullable(),
      lifecycleStatus: z.string(),
    }),
  ),
  inactiveManager: z.array(
    z.object({
      userId: z.string().nullable(),
      name: z.string().nullable(),
      managerUserId: z.string().nullable(),
      managerName: z.string().nullable(),
      managerState: managerStateContract,
      effectiveFrom: z.string(),
    }),
  ),
  circular: z.array(z.object({ userIds: z.array(z.string()) })),
  overSpan: z.array(
    z.object({
      managerUserId: z.string().nullable(),
      managerName: z.string().nullable(),
      directReports: z.number().int(),
    }),
  ),
});

export type ManagerState = z.infer<typeof managerStateContract>;
export type ReportingLineEntry = z.infer<typeof reportingLineEntryContract>;
export type ReportingLineView = z.infer<typeof reportingLineViewContract>;
export type ManagerCoverageReport = z.infer<typeof managerCoverageReportContract>;
