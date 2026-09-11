import { z } from "zod";

export const surveyCollectorRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  surveyId: z.number(),
  versionId: z.number().nullable(),
  collectorType: z.string(),
  name: z.string(),
  token: z.string(),
  status: z.enum(["active", "paused", "closed", "expired"]),
  source: z.string().nullable(),
  utm: z.record(z.string(), z.unknown()),
  settings: z.record(z.string(), z.unknown()),
  opens: z.number(),
  starts: z.number(),
  completions: z.number(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const surveyCollectorListContract = z.array(surveyCollectorRowContract);
