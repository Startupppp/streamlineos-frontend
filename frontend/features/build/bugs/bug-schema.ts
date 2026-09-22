import { z } from "zod";

export const bugFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  severity: z.enum(["blocker", "critical", "major", "minor", "trivial"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["new", "triaged", "assigned", "in_progress", "fixed", "ready_for_qa", "verified", "reopened", "closed"]),
  stepsToReproduce: z.string(),
  expectedResult: z.string(),
  actualResult: z.string(),
  environment: z.string(),
  browserDevice: z.string(),
  affectedReleaseId: z.string(),
  fixedReleaseId: z.string(),
  assigneeId: z.string(),
  qaOwnerId: z.string(),
  linkedTicketId: z.string(),
});

export type BugFormValues = z.infer<typeof bugFormSchema>;
