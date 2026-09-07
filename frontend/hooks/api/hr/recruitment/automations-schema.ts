import { z } from "zod";

const pipelineAutomationSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  trigger: z.enum([
    "STAGE_CHANGED",
    "INTERVIEW_RESULT_SET",
    "SLA_BREACHED",
    "OFFER_SENT",
    "OFFER_ACCEPTED",
    "OFFER_REJECTED",
    "SCORECARD_SUBMITTED",
  ]),
  triggerConditions: z.record(z.string(), z.unknown()),
  action: z.enum([
    "SEND_EMAIL",
    "MOVE_TO_STAGE",
    "CREATE_INTERVIEW",
    "SEND_NOTIFICATION",
    "NOTIFY_HIRING_MANAGER",
  ]),
  actionPayload: z.record(z.string(), z.unknown()),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const pipelineAutomationWithCreatorSchema = pipelineAutomationSchema.extend({
  creator: z.object({ name: z.string().nullable() }).nullable().optional(),
});

export const pipelineAutomationWithCreatorListSchema = z.array(pipelineAutomationWithCreatorSchema);

export const pipelineAutomationResponseSchema = pipelineAutomationSchema;

export const automationSuccessSchema = z.object({ success: z.literal(true) });
