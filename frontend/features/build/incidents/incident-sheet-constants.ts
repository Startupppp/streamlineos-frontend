import type { IncidentSeverity, IncidentStatus } from "@/hooks/api/build/incidents-schema";
import type { IncidentFormValues } from "@/features/build/incidents/incident-schema";

export const SEVERITIES: IncidentSeverity[] = ["critical", "high", "medium", "low"];
export const STATUSES: IncidentStatus[] = [
  "detected",
  "investigating",
  "mitigating",
  "resolved",
  "postmortem",
  "closed",
];
export const NO_RELEASE = "none";
export const STATUS_LABELS: Record<IncidentStatus, string> = {
  detected: "Detected",
  investigating: "Investigating",
  mitigating: "Mitigating",
  resolved: "Resolved",
  postmortem: "Post-mortem",
  closed: "Closed",
};

export const DEFAULT_VALUES: IncidentFormValues = {
  title: "",
  description: "",
  severity: "medium",
  status: "detected",
  impact: "",
  ownerId: "",
  rootCause: "",
  customerComms: "",
  detectedAt: "",
  responseDueAt: "",
  resolutionDueAt: "",
  linkedTicketId: "",
  releaseId: "",
  followUpWaiverReason: "",
};

export function toLocalDt(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}
