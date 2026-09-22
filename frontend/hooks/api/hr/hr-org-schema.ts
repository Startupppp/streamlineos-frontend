import { z } from "zod";

export const jobRoleRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const jobRoleListContract = z.array(jobRoleRowContract);

export const jobLevelRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  grade: z.string().nullable(),
  rank: z.number().int(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const jobLevelListContract = z.array(jobLevelRowContract);

export const successResponseContract = z.object({ success: z.boolean() });
