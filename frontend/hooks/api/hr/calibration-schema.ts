import { z } from "zod";

export const calibrationEntryContract = z.object({
  id: z.number(),
  orgId: z.string(),
  cycleId: z.number().nullable(),
  userId: z.string(),
  performanceScore: z.string().nullable(),
  potentialScore: z.string().nullable(),
  box: z.string().nullable(),
  note: z.string().nullable(),
  calibratedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const calibrationEntryListContract = z.array(calibrationEntryContract);

export const nineBoxEntryContract = z.object({
  employeeId: z.string(),
  performance: z.string().nullable(),
  potential: z.string().nullable(),
  box: z.string().nullable(),
  note: z.string().nullable(),
});

export const nineBoxListContract = z.array(nineBoxEntryContract);
