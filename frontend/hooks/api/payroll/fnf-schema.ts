import { z } from "zod";

export const fnfRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userId: z.string(),
  resignationId: z.number().nullable(),
  basicDues: z.string(),
  leaveEncashment: z.string(),
  bonusDue: z.string(),
  deductions: z.string(),
  loanRecovery: z.string(),
  netPayable: z.string(),
  status: z.string(),
  userMembershipId: z.number().nullable(),
  approvedBy: z.string().nullable(),
  notes: z.string().nullable(),
  reimbursementsDue: z.string(),
  assetRecovery: z.string(),
  noticeRecovery: z.string(),
  otherDeductions: z.string(),
  statementPublishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const fnfGetOneContract = fnfRowContract.extend({
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
});

export const fnfStatementContract = z.object({
  settlementId: z.number(),
  employee: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  components: z.array(
    z.object({
      label: z.string(),
      amount: z.string(),
      type: z.literal("deduction").optional(),
    }),
  ),
  netPayable: z.string(),
  status: z.string(),
});

const fnfWithUserContract = fnfRowContract.extend({
  user: z.object({ name: z.string().nullable(), email: z.string() }).nullable().optional(),
});

export const fnfInsightsListContract = z.object({
  items: z.array(fnfWithUserContract),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
});

export const updateFnfResultContract = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(false) }),
  z.object({ ok: z.literal(true), record: fnfRowContract }),
]);

export type FnfRow = z.infer<typeof fnfRowContract>;
