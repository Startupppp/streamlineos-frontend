import { z } from "zod";

export const hiringRoundSchema = z.object({
  id: z.number().int(),
  flowId: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  roundType: z.enum(["HR_SCREENING", "TECHNICAL", "MANAGER", "CULTURAL_FIT", "FINAL", "CUSTOM"]),
  mode: z.enum(["VIDEO", "PHONE", "ONSITE"]),
  durationMinutes: z.number().int(),
  slaDays: z.number().int().nullable(),
  questionBankTag: z.string().nullable(),
  scorecardTemplateId: z.number().int().nullable(),
  interviewerRoleRestriction: z.string().nullable(),
  autoAdvanceThreshold: z.number().int().nullable(),
  orderIndex: z.number().int(),
  createdAt: z.string(),
});

export const hiringFlowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const hiringFlowWithRoundsSchema = hiringFlowSchema.extend({
  rounds: z.array(hiringRoundSchema),
});

export const hiringFlowListResponseSchema = z.object({
  items: z.array(hiringFlowWithRoundsSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export const hiringFlowSuccessSchema = z.object({ success: z.literal(true) });
