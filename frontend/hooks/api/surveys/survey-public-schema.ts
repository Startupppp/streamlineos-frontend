import { z } from "zod";

export const surveyPublicSurveyContract = z.object({
  survey: z.object({
    id: z.number(),
    title: z.string(),
    description: z.string().nullable(),
    mode: z.enum(["survey", "assessment", "live_session", "lead_qualification", "custom"]),
    defaultLanguage: z.string(),
    branding: z.record(z.string(), z.unknown()),
    settings: z.record(z.string(), z.unknown()),
  }),
  schema: z.record(z.string(), z.unknown()).nullable(),
});

export const surveyPublicSessionRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  surveyId: z.number(),
  versionId: z.number(),
  collectorId: z.number().nullable(),
  participantId: z.number().nullable(),
  anonymous: z.boolean(),
  startedAt: z.string(),
  submittedAt: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  score: z.number().nullable(),
  passed: z.boolean().nullable(),
  segment: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  status: z.enum(["in_progress", "submitted", "abandoned", "expired"]),
});

export const publicSuccessContract = z.object({ success: z.literal(true) });
