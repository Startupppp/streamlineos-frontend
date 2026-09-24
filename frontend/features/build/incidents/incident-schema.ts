import { z } from "zod";
import {
  incidentSeverityContract,
  incidentStatusContract,
} from "@/hooks/api/build/incidents-schema";

export const incidentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  severity: incidentSeverityContract,
  status: incidentStatusContract,
  impact: z.string(),
  ownerId: z.string(),
  rootCause: z.string(),
  customerComms: z.string(),
  detectedAt: z.string(),
  responseDueAt: z.string(),
  resolutionDueAt: z.string(),
  linkedTicketId: z.string(),
  releaseId: z.string(),
  followUpWaiverReason: z.string().max(1000),
});

export type IncidentFormValues = z.infer<typeof incidentFormSchema>;

export const incidentUpdateSchema = z.object({
  message: z.string().min(1, "Message is required"),
  newStatus: incidentStatusContract.or(z.literal("none")),
  followUpWaiverReason: z.string().max(1000),
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
