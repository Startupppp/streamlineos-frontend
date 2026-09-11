import { z } from "zod";

export const calibrationEntryContract = z.object({
  id: z.number(),
  orgId: z.string(),
  cycleId: z.number(),
  employeeId: z.string(),
  employeeMembershipId: z.number().nullable(),
  preRating: z.string().nullable(),
  postRating: z.string().nullable(),
  calibratedBy: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const calibrationEntryListContract = z.array(calibrationEntryContract);

export const nineBoxEntryContract = z.object({
  employeeId: z.string(),
  performance: z.number(),
  potential: z.number(),
  box: z.string(),
  note: z.string().nullable(),
});

export const nineBoxListContract = z.array(nineBoxEntryContract);
