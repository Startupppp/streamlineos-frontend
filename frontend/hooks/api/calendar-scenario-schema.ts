import { z } from "zod";

export const calendarScenarioPreviewContract = z.object({
  token: z.string(),
  expiresAt: z.string(),
  before: z.object({ risk: z.enum(["healthy", "at_risk", "unknown"]), coverage: z.enum(["complete", "incomplete"]) }),
  after: z.object({ risk: z.enum(["healthy", "at_risk", "unknown"]), coverage: z.enum(["complete", "incomplete"]) }),
  impacts: z.array(z.object({
    index: z.number().int().nonnegative(),
    sourceKey: z.string(),
    title: z.string(),
    summary: z.string(),
    changes: z.array(z.object({ field: z.string(), before: z.string().nullable(), after: z.string().nullable() })),
    warnings: z.array(z.string()),
  })),
  scheduleChanges: z.array(z.object({
    index: z.number().int().nonnegative(),
    title: z.string(),
    field: z.string(),
    before: z.string().nullable(),
    after: z.string().nullable(),
    deltaMinutes: z.number().int().nullable(),
    direction: z.enum(["earlier", "later", "unchanged", "unknown"]),
  })),
  affected: z.object({ people: z.array(z.string()), commitments: z.array(z.string()), resources: z.array(z.string()), customers: z.array(z.string()) }),
  confidence: z.enum(["complete", "partial", "unknown"]),
});

export type CalendarScenarioPreview = z.infer<typeof calendarScenarioPreviewContract>;
