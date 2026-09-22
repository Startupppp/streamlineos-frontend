import { z } from "zod";
import type { ApprovalEntityType } from "@/types/projects";

export const decideApprovalSchema = z.object({
  decision: z.enum(["approved", "rejected", "changes_requested"]),
  decisionComment: z.string(),
});

export type DecideApprovalValues = z.infer<typeof decideApprovalSchema>;

export const delegateApprovalSchema = z.object({
  approverId: z.string().min(1, "Required"),
});

export type DelegateApprovalValues = z.infer<typeof delegateApprovalSchema>;

const TITLE_REGEX = /\S/;

export const requestApprovalSchema = z.object({
  entityType: z.enum([
    "task", "milestone", "budget", "release",
    "change_request", "timesheet",
  ] as [ApprovalEntityType, ...ApprovalEntityType[]]),
  entityId: z.string().min(1, "Select an item"),
  title: z
    .string()
    .min(1, "Required")
    .max(200, "Max 200 characters")
    .refine((v) => TITLE_REGEX.test(v), { message: "Title cannot be blank" }),
  approverId: z.string().min(1, "Select an approver"),
  reason: z.string().max(2000, "Max 2000 characters").optional(),
  dueAt: z.string().optional(),
  level: z.enum(["1", "2", "3"]),
});

export type RequestApprovalValues = z.infer<typeof requestApprovalSchema>;
