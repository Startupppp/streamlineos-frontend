import { z } from "zod";

export const generateReportContract = z.object({
  rows: z.array(z.record(z.string(), z.unknown())),
  entity: z.string(),
  fields: z.array(z.string()),
  total: z.number().int(),
});

const scheduledReportRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  reportConfig: z.object({
    entity: z.string(),
    fields: z.array(z.string()),
    filters: z.record(z.string(), z.unknown()).optional(),
  }),
  schedule: z.string(),
  recipients: z.array(z.string()),
  lastRunAt: z.string().nullable(),
  createdAt: z.string(),
});

export const scheduledReportsListContract = z.array(scheduledReportRowSchema);

export const createScheduledReportContract = scheduledReportRowSchema;

export const deleteScheduledReportContract = z.object({ success: z.literal(true) });

export const diversityReportContract = z.object({
  total: z.number().int(),
  genderBreakdown: z.array(z.object({ gender: z.string(), count: z.number().int() })),
  locationBreakdown: z.array(z.object({ location: z.string(), count: z.number().int() })),
  sourceBreakdown: z.array(z.object({ source: z.string(), count: z.number().int() })),
  stageBreakdown: z.array(z.object({ stage: z.string(), count: z.number().int() })),
});
