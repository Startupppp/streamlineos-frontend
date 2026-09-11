import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

export const entryContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userMembershipId: z.number().nullable(),
  ticketId: z.number().nullable(),
  projectId: z.number().nullable(),
  date: z.string(),
  hours: z.string(),
  description: z.string().nullable(),
  isBillable: z.boolean(),
  billingType: z.enum(["BILLABLE", "NON_BILLABLE", "FIXED"]),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  submittedAt: z.string().nullable(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  lockedAt: z.string().nullable(),
  voidedAt: z.string().nullable(),
  invoicingStatus: z.enum(["UNINVOICED", "INVOICE_DRAFTED", "INVOICED"]),
  billRate: z.string().nullable(),
  currency: z.string().nullable(),
  rateSource: z.string().nullable(),
  source: z.enum(["MANUAL", "TIMER", "API", "IMPORT"]),
  workLink: z.string().nullable(),
  timesheetPeriodId: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  project: z.object({ id: z.number(), name: z.string() }).nullable(),
  ticket: z
    .object({
      id: z.number(),
      title: z.string(),
      ticketNumber: z.number(),
      project: z.object({ id: z.number(), name: z.string() }).nullable(),
    })
    .nullable(),
});

export const entriesListResponseContract = cursorPageContract(entryContract);

export type TimesheetEntry = z.infer<typeof entryContract>;

export const entryVoidResultContract = z.object({ success: z.literal(true) });
