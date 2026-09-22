import { z } from "zod";

export const testCaseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  suiteId: z.string(),
  preconditions: z.string(),
  steps: z.array(z.object({ action: z.string(), expected: z.string() })),
  expectedResult: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  automationStatus: z.enum(["manual", "automated", "planned"]),
  component: z.string(),
  linkedTicketId: z.string(),
});

export type TestCaseFormValues = z.infer<typeof testCaseSchema>;

export const testRunSchema = z.object({
  name: z.string().min(1, "Name is required"),
  environment: z.string(),
  browserDevice: z.string(),
  testerId: z.string(),
  suiteId: z.string(),
});

export type TestRunFormValues = z.infer<typeof testRunSchema>;
