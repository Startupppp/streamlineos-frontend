import { z } from "zod";

export const generateReportContract = z.object({
  rows: z.array(z.record(z.string(), z.unknown())),
  entity: z.string(),
  fields: z.array(z.string()),
  total: z.number().int(),
});

export const scheduledReportsListContract = z.array(z.object({
  id: z.number().int(),
  orgId: z.string(),
  reportType: z.string().optional(),
  schedule: z.string().optional(),
  createdBy: z.string().optional(),
  name: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
}));

export const createScheduledReportContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  reportType: z.string().optional(),
  schedule: z.string().optional(),
  createdBy: z.string().optional(),
  name: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export const deleteScheduledReportContract = z.object({ success: z.literal(true) });

export const diversityReportContract = z.object({
  total: z.number().int(),
  genderBreakdown: z.array(z.object({ gender: z.string(), count: z.number().int() })),
  locationBreakdown: z.array(z.object({ location: z.string(), count: z.number().int() })),
  sourceBreakdown: z.array(z.object({ source: z.string(), count: z.number().int() })),
  stageBreakdown: z.array(z.object({ stage: z.string(), count: z.number().int() })),
});
