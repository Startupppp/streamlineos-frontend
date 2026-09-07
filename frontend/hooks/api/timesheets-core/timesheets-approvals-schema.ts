import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";
import { timesheetPeriodContract } from "./timesheets-period-schema";

export const timesheetApprovalItemContract = timesheetPeriodContract.extend({
  approvedBy: z.string().nullable(),
  user: z.object({
    membershipId: z.number().nullable(),
    name: z.string().nullable(),
    email: z.string().nullable(),
  }),
});

export const approvalsListResponseContract = cursorPageContract(timesheetApprovalItemContract);

export const bulkApproveResponseContract = z.object({
  approved: z.number(),
  skipped: z.number(),
});

export const bulkRejectResponseContract = z.object({ rejected: z.number() });
