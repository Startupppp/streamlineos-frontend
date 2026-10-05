import {
  incidentsGetIncidentResponseSchema,
  incidentsCreateIncidentResponseSchema,
  incidentsAddUpdateResponseSchema,
  incidentsAddDecisionResponseSchema,
  incidentsAddFollowUpActionResponseSchema,
  incidentsListIncidentsResponseSchema,
  incidentsCreateIncidentBodySchema,
  incidentsUpdateIncidentBodySchema,
  incidentsAddUpdateBodySchema,
  incidentsAddDecisionBodySchema,
  incidentsAddFollowUpActionBodySchema,
  incidentsUpdateFollowUpActionBodySchema,
  type IncidentsCreateIncidentResponse,
  type IncidentsAddUpdateResponse,
  type IncidentsAddDecisionResponse,
  type IncidentsAddFollowUpActionResponse,
  type IncidentsGetIncidentResponse,
  type IncidentsCreateIncidentBody,
  type IncidentsUpdateIncidentBody,
  type IncidentsAddUpdateBody,
  type IncidentsAddDecisionBody,
  type IncidentsAddFollowUpActionBody,
  type IncidentsUpdateFollowUpActionBody,
} from "@/contracts/build-contracts.generated";

export const incidentSeverityContract = incidentsGetIncidentResponseSchema.shape.severity;
export const incidentStatusContract = incidentsGetIncidentResponseSchema.shape.status;
export const incidentFollowUpStatusContract = incidentsAddFollowUpActionResponseSchema.shape.status;

export const incidentRowContract = incidentsCreateIncidentResponseSchema;
export const incidentPageContract = incidentsListIncidentsResponseSchema;
export const incidentResponseContract = incidentsListIncidentsResponseSchema;
export const incidentUpdateRowContract = incidentsAddUpdateResponseSchema;
export const incidentDecisionRowContract = incidentsAddDecisionResponseSchema;
export const incidentFollowUpActionRowContract = incidentsAddFollowUpActionResponseSchema;
export const incidentDetailContract = incidentsGetIncidentResponseSchema;

export const createIncidentInputContract = incidentsCreateIncidentBodySchema;
export const updateIncidentInputContract = incidentsUpdateIncidentBodySchema;
export const addIncidentUpdateInputContract = incidentsAddUpdateBodySchema;
export const addIncidentDecisionInputContract = incidentsAddDecisionBodySchema;
export const createIncidentFollowUpActionInputContract = incidentsAddFollowUpActionBodySchema;
export const updateIncidentFollowUpActionInputContract = incidentsUpdateFollowUpActionBodySchema;

export type IncidentSeverity = IncidentsGetIncidentResponse["severity"];
export type IncidentStatus = IncidentsGetIncidentResponse["status"];
export type IncidentFollowUpStatus = IncidentsAddFollowUpActionResponse["status"];
export type Incident = IncidentsCreateIncidentResponse;
export type IncidentUpdate = IncidentsAddUpdateResponse;
export type IncidentDecision = IncidentsAddDecisionResponse;
export type IncidentFollowUpAction = IncidentsAddFollowUpActionResponse;
export type IncidentDetail = IncidentsGetIncidentResponse;
export type CreateIncidentInput = IncidentsCreateIncidentBody;
export type UpdateIncidentInput = IncidentsUpdateIncidentBody;
export type AddIncidentUpdateInput = IncidentsAddUpdateBody;
export type AddIncidentDecisionInput = IncidentsAddDecisionBody;
export type CreateIncidentFollowUpActionInput = IncidentsAddFollowUpActionBody;
export type UpdateIncidentFollowUpActionInput = IncidentsUpdateFollowUpActionBody;
