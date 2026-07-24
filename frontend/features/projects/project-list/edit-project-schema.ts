import { z } from "zod";

export const PROJECT_STATUSES = ["ACTIVE", "COMPLETED", "ARCHIVED"] as const;
export const PROJECT_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const editProjectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  status: z.enum(PROJECT_STATUSES),
  priority: z.enum(PROJECT_PRIORITIES).optional(),
  managerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

export type EditProjectFormValues = z.infer<typeof editProjectSchema>;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];

export function toProjectStatus(raw: string | null | undefined): ProjectStatus {
  return PROJECT_STATUSES.find((s) => s === raw) ?? "ACTIVE";
}

export function toProjectPriority(raw: string | null | undefined): ProjectPriority | undefined {
  return PROJECT_PRIORITIES.find((p) => p === raw);
}
