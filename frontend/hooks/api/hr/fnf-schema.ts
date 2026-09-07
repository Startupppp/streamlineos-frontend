import { z } from "zod";

const fnfUserContract = z.object({
  name: z.string().nullable(),
  email: z.string(),
}).nullable().optional();

export const fnfRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  resignationId: z.number().int().nullable(),
  basicDues: z.string(),
  leaveEncashment: z.string(),
  bonusDue: z.string(),
  deductions: z.string(),
  loanRecovery: z.string(),
  netPayable: z.string(),
  status: z.string(),
  userMembershipId: z.number().int().nullable(),
  approvedBy: z.string().nullable(),
  notes: z.string().nullable(),
  reimbursementsDue: z.string(),
  assetRecovery: z.string(),
  noticeRecovery: z.string(),
  otherDeductions: z.string(),
  statementPublishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: fnfUserContract,
});

export const fnfListContract = z.object({
  items: z.array(fnfRowContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});
