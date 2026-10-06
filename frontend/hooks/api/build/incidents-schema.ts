import {
  incidentsGetIncidentResponseSchema,
  type IncidentsGetIncidentResponse,
  type IncidentsAddFollowUpActionResponse,
} from "@/contracts/build-contracts.generated";

export const incidentSeverityContract = incidentsGetIncidentResponseSchema.shape.severity;
export const incidentStatusContract = incidentsGetIncidentResponseSchema.shape.status;

export type IncidentSeverity = IncidentsGetIncidentResponse["severity"];
export type IncidentStatus = IncidentsGetIncidentResponse["status"];
export type IncidentFollowUpStatus = IncidentsAddFollowUpActionResponse["status"];
