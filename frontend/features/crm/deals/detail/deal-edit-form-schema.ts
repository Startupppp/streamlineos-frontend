import { z } from "zod";

export const dealEditSchema = z.object({
  name: z.string().min(1, "Name is required"),
  value: z.string().optional(),
  stage: z.string().min(1),
  probability: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
  lostReason: z.string().optional(),
  partyId: z.string().optional(),
  subjectId: z.string().optional(),
});

export type EditFormValues = z.infer<typeof dealEditSchema>;
