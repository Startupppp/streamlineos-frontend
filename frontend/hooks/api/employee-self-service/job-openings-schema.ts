import { z } from "zod";

export const selfJobOpeningContract = z.object({
  id: z.number().int(),
  title: z.string(),
  departmentId: z.string().nullable(),
  location: z.string().nullable(),
  type: z.string(),
  experience: z.string().nullable(),
  description: z.string().nullable(),
  requirements: z.string().nullable(),
  openings: z.number().int(),
  applicationDeadline: z.string().nullable(),
  createdAt: z.string(),
  department: z
    .object({ id: z.string(), name: z.string() })
    .nullable(),
});

export const selfJobOpeningsContract = z.array(selfJobOpeningContract);

export const selfJobApplicationContract = z.object({
  id: z.number().int(),
});

export type SelfJobOpening = z.infer<typeof selfJobOpeningContract>;
