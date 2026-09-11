import { z } from "zod";

const managerTeamMemberContract = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  pendingReimbursements: z.number(),
  pendingLoans: z.number(),
  latestPayslip: z
    .object({
      month: z.string(),
      net: z.string().nullable(),
      publicationId: z.number(),
    })
    .nullable(),
  taxDeclarationStatus: z.string().nullable(),
  actionCount: z.number(),
});

const managerPendingReimbursementContract = z.object({
  id: z.number(),
  userId: z.string(),
  userName: z.string().nullable(),
  category: z.string(),
  amount: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
});

const managerPendingLoanContract = z.object({
  id: z.number(),
  userId: z.string(),
  userName: z.string().nullable(),
  amount: z.string(),
  reason: z.string().nullable(),
  totalEmis: z.number().nullable(),
  createdAt: z.string(),
});

export const managerInboxResultContract = z.object({
  mode: z.literal("manager_self_service"),
  honestyNote: z.string(),
  reportCount: z.number(),
  canApproveReimbursements: z.boolean(),
  canApproveLoans: z.boolean(),
  members: z.array(managerTeamMemberContract),
  pendingReimbursements: z.array(managerPendingReimbursementContract),
  pendingLoans: z.array(managerPendingLoanContract),
  totals: z.object({
    pendingReimbursements: z.number(),
    pendingLoans: z.number(),
    membersNeedingAction: z.number(),
  }),
});

const teamRewardsMemberRowContract = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  annualCtc: z.string().nullable(),
  activeBenefitPlans: z.number(),
  estimatedEmployerBenefitsAnnual: z.string().nullable(),
  equityUnits: z.number(),
});

export const payCompressionResultContract = z.object({
  mode: z.literal("cash_ctc_only"),
  honestyNote: z.string(),
  sampleSize: z.number(),
  stats: z.object({
    min: z.string(),
    max: z.string(),
    mean: z.string(),
    median: z.string(),
    p25: z.string(),
    p75: z.string(),
    compressionRatio: z.string().nullable(),
  }),
  outliers: z.array(
    z.object({
      userId: z.string(),
      label: z.string().nullable(),
      annualCtc: z.string(),
      side: z.enum(["below", "above"]),
    }),
  ),
  missingCtcCount: z.number(),
});

export const teamRewardsResultContract = z.object({
  mode: z.literal("manager_team_rewards"),
  honestyNote: z.string(),
  reportCount: z.number(),
  members: z.array(teamRewardsMemberRowContract),
  payCompression: payCompressionResultContract,
});

export const orgPayCompressionContract = payCompressionResultContract.extend({
  scope: z.literal("organization"),
});

export const updateReimbursementResultContract = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(false), reason: z.enum(["not_found", "own_request"]) }),
  z.object({ ok: z.literal(true) }),
]);

export const updateLoanResultContract = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(false), reason: z.enum(["not_found", "own_request"]) }),
  z.object({ ok: z.literal(true) }),
]);

export type ManagerInboxResult = z.infer<typeof managerInboxResultContract>;
export type TeamRewardsResult = z.infer<typeof teamRewardsResultContract>;
