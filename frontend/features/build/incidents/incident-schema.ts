import { z } from "zod";

export const incidentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  status: z.enum([
    "detected",
    "investigating",
    "mitigating",
    "resolved",
    "postmortem",
    "closed",
  ]),
  impact: z.string(),
  ownerId: z.string(),
  detectedAt: z.string(),
  responseDueAt: z.string(),
  resolutionDueAt: z.string(),
  linkedTicketId: z.string(),
});

export type IncidentFormValues = z.infer<typeof incidentFormSchema>;

export const incidentUpdateSchema = z.object({
  message: z.string().min(1, "Message is required"),
  newStatus: z.string(),
});

export type IncidentUpdateValues = z.infer<typeof incidentUpdateSchema>;

export const incidentDecisionSchema = z.object({
  decision: z.string().min(1, "Decision is required"),
  rationale: z.string(),
});

export type IncidentDecisionValues = z.infer<typeof incidentDecisionSchema>;

export const incidentFollowUpSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  ownerId: z.string(),
  dueAt: z.string(),
});

export type IncidentFollowUpValues = z.infer<typeof incidentFollowUpSchema>;
