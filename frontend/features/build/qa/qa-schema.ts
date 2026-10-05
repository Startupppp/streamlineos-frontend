import { z } from "zod";

export const testCaseSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
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
  name: z.string().trim().min(1, "Name is required"),
  environment: z.string(),
  browserDevice: z.string(),
  testerId: z.string(),
  suiteId: z.string(),
  mode: z.enum(["suite", "cases"]),
  caseIds: z.array(z.number().int().positive()).refine((ids) => new Set(ids).size === ids.length, "Choose each test case once."),
}).superRefine((values, context) => {
  if (values.mode === "cases" && values.caseIds.length === 0) {
    context.addIssue({ code: "custom", path: ["caseIds"], message: "Select at least one test case." });
  }
});

export type TestRunFormValues = z.infer<typeof testRunSchema>;
