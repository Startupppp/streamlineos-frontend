import { z } from "zod";

export const sampleDataStatusContract = z.object({
  present: z.boolean(),
  people: z.number(),
  payees: z.number(),
  salaryProfiles: z.number(),
});

export type SampleDataStatus = z.infer<typeof sampleDataStatusContract>;
