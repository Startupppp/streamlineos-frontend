"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

export type AssignmentType =
  | "assign_user"
  | "round_robin"
  | "weighted_round_robin"
  | "least_loaded"
  | "territory";

export interface AssignmentRuleCondition {
  field: string;
  operator: string;
  value: string;
}

export interface WeightedMember {
  userId: string;
  weight: number;
}

export interface AssignmentRule {
  id: number;
  orgId: string;
  name: string;
  assignmentType: AssignmentType;
  assignToUserId: string | null;
  roundRobinUserIds: string[] | null;
  weightedMembers: WeightedMember[] | null;
  windowHours: number | null;
  territoryId: number | null;
  conditions: AssignmentRuleCondition[];
  priority: number;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateAssignmentRuleInput {
  name: string;
  assignmentType: AssignmentType;
  assignToUserId?: string;
  roundRobinUserIds?: string[];
  weightedMembers?: WeightedMember[];
  windowHours?: number;
  territoryId?: number;
  conditions: AssignmentRuleCondition[];
  priority?: number;
  isActive?: boolean;
}

export interface UpdateAssignmentRuleInput {
  id: number;
  name?: string;
  assignmentType?: AssignmentType;
  assignToUserId?: string;
  roundRobinUserIds?: string[];
  weightedMembers?: WeightedMember[];
  windowHours?: number;
  territoryId?: number;
  conditions?: AssignmentRuleCondition[];
  priority?: number;
  isActive?: boolean;
}

interface ReorderAssignmentRulesInput {
  ruleIds: number[];
}

export interface ScoringRule {
  id: number;
  orgId: string;
  field: string;
  operator: string;
  value: string;
  points: number;
  createdAt: string | null;
}

export interface CreateScoringRuleInput {
  field: string;
  operator: string;
  value: string;
  points: number;
}

export interface UpdateScoringRuleInput {
  id: number;
  field?: string;
  operator?: string;
  value?: string;
  points?: number;
}

export function useAssignmentRules() {
  const canManage = useCan("crm:assignment-rules:manage");
  return useQuery({
    queryKey: queryKeys.crmSettings.assignmentRules(),
    queryFn: () => apiClient.get<AssignmentRule[]>("/crm/assignment-rules"),
    staleTime: 2 * 60_000,
    enabled: canManage,
  });
}

export function useCreateAssignmentRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "assignment-rules", "create"],
    mutationFn: (input: CreateAssignmentRuleInput) =>
      apiClient.post<AssignmentRule>("/crm/assignment-rules", input),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.crmSettings.assignmentRules(),
      });
    },
  });
}

export function useUpdateAssignmentRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "assignment-rules", "update"],
    mutationFn: ({ id, ...data }: UpdateAssignmentRuleInput) =>
      apiClient.patch<AssignmentRule>(`/crm/assignment-rules/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.crmSettings.assignmentRules(),
      });
    },
  });
}

export function useDeleteAssignmentRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "assignment-rules", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/assignment-rules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.crmSettings.assignmentRules(),
      });
    },
  });
}

export function useReorderAssignmentRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "assignment-rules", "reorder"],
    mutationFn: (input: ReorderAssignmentRulesInput) =>
      apiClient.patch<{ success: boolean }>(
        "/crm/assignment-rules/reorder",
        input,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.crmSettings.assignmentRules(),
      });
    },
  });
}

export interface EmailTemplate {
  id: number;
  orgId: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateEmailTemplateInput {
  name: string;
  subject: string;
  body: string;
}

export interface UpdateEmailTemplateInput {
  id: number;
  name?: string;
  subject?: string;
  body?: string;
}

export function useEmailTemplates(params?: {
  limit?: number;
  offset?: number;
}) {
  const canManage = useCan("crm:email-templates:manage");
  return useQuery({
    queryKey: queryKeys.crmSettings.emailTemplates(
      params as Record<string, unknown>,
    ),
    queryFn: () =>
      apiClient.get<EmailTemplate[]>(
        "/crm/email-templates",
        params as Record<string, unknown>,
      ),
    staleTime: 2 * 60_000,
    enabled: canManage,
  });
}

export function useCreateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "email-templates", "create"],
    mutationFn: (input: CreateEmailTemplateInput) =>
      apiClient.post<EmailTemplate>("/crm/email-templates", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.all });
    },
  });
}

export function useUpdateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "email-templates", "update"],
    mutationFn: ({ id, ...data }: UpdateEmailTemplateInput) =>
      apiClient.patch<EmailTemplate>(`/crm/email-templates/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.all });
    },
  });
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "email-templates", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/email-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.all });
    },
  });
}

export function useScoringRules() {
  const canManage = useCan("crm:scoring-rules:manage");
  return useQuery({
    queryKey: queryKeys.crmSettings.scoringRules(),
    queryFn: () => apiClient.get<ScoringRule[]>("/crm/scoring-rules"),
    staleTime: 2 * 60_000,
    enabled: canManage,
  });
}

export function useCreateScoringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "scoring-rules", "create"],
    mutationFn: (input: CreateScoringRuleInput) =>
      apiClient.post<ScoringRule>("/crm/scoring-rules", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.scoringRules() });
    },
  });
}

export function useUpdateScoringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "scoring-rules", "update"],
    mutationFn: ({ id, ...data }: UpdateScoringRuleInput) =>
      apiClient.patch<ScoringRule>(`/crm/scoring-rules/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.scoringRules() });
    },
  });
}

export function useDeleteScoringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "scoring-rules", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/scoring-rules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.scoringRules() });
    },
  });
}

export interface SlaPolicy {
  id: number;
  orgId: string;
  name: string;
  appliesTo: "lead" | "deal" | "both";
  priority: "low" | "medium" | "high" | "urgent";
  firstResponseHours: number;
  resolutionHours: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SlaReport {
  total: number;
  compliant: number;
  breached: number;
  complianceRate: number;
}

export interface SlaBreachedLead {
  id: number;
  name: string;
  status: string;
  slaDeadline: string | null;
}

export interface CreateSlaPolicyInput {
  name: string;
  appliesTo: "lead" | "deal" | "both";
  priority: "low" | "medium" | "high" | "urgent";
  firstResponseHours: number;
  resolutionHours: number;
}

export interface UpdateSlaPolicyInput {
  id: number;
  name?: string;
  appliesTo?: "lead" | "deal" | "both";
  priority?: "low" | "medium" | "high" | "urgent";
  firstResponseHours?: number;
  resolutionHours?: number;
}

export function useSlaPolicies() {
  const canManage = useCan("crm:sla:manage");
  return useQuery({
    queryKey: queryKeys.crmSettings.slaPolicies(),
    queryFn: () => apiClient.get<SlaPolicy[]>("/crm/sla/policies"),
    staleTime: 2 * 60_000,
    enabled: canManage,
  });
}

export function useSlaReport() {
  const canManage = useCan("crm:sla:manage");
  return useQuery({
    queryKey: queryKeys.crmSettings.slaReport(),
    queryFn: () => apiClient.get<SlaReport>("/crm/sla/report"),
    staleTime: 2 * 60_000,
    enabled: canManage,
  });
}

export function useSlaBreachedLeads(params?: { limit?: number }) {
  const canManage = useCan("crm:sla:manage");
  return useQuery({
    queryKey: queryKeys.crmSettings.slaBreachedLeads(
      params as Record<string, unknown>,
    ),
    queryFn: () =>
      apiClient.get<SlaBreachedLead[]>(
        "/crm/sla/breached",
        params as Record<string, unknown>,
      ),
    staleTime: 2 * 60_000,
    enabled: canManage,
  });
}

export function useCreateSlaPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "sla-policies", "create"],
    mutationFn: (input: CreateSlaPolicyInput) =>
      apiClient.post<SlaPolicy>("/crm/sla/policies", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.slaPolicies() });
    },
  });
}

export function useUpdateSlaPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "sla-policies", "update"],
    mutationFn: ({ id, ...data }: UpdateSlaPolicyInput) =>
      apiClient.patch<SlaPolicy>(`/crm/sla/policies/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.slaPolicies() });
    },
  });
}

export function useDeleteSlaPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "sla-policies", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/sla/policies/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.slaPolicies() });
    },
  });
}

export interface TerritoryCriteria {
  countries?: string[];
  states?: string[];
  cities?: string[];
  postalCodes?: string[];
  industries?: string[];
  companySizes?: string[];
  productKeys?: string[];
  accountTypes?: string[];
}

export interface Territory {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  states: string[];
  cities: string[];
  assignedReps: number[];
  criteria: TerritoryCriteria;
  priority: number;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

interface CreateTerritoryInput {
  name: string;
  description?: string;
  criteria?: TerritoryCriteria;
  priority?: number;
  isActive?: boolean;
  assignedReps?: number[];
}

interface UpdateTerritoryInput {
  id: number;
  name?: string;
  description?: string | null;
  criteria?: TerritoryCriteria;
  priority?: number;
  isActive?: boolean;
  assignedReps?: number[];
}

export interface TerritoryPreviewResult {
  matchedTerritory: Territory | null;
  /** Raw `crmPersonId` values — for logic only. Render `assignedRepNames` (§15). */
  assignedReps: number[];
  assignedRepNames: string[];
}

export function useTerritories() {
  const canManage = useCan("crm:territories:manage");
  return useQuery({
    queryKey: queryKeys.crmSettings.territories(),
    queryFn: () => apiClient.get<Territory[]>("/crm/territories"),
    staleTime: 2 * 60_000,
    enabled: canManage,
  });
}

export function useCreateTerritory() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "territories", "create"],
    mutationFn: (input: CreateTerritoryInput) =>
      apiClient.post<Territory>("/crm/territories", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.territories() });
    },
  });
}

export function useUpdateTerritory() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "territories", "update"],
    mutationFn: ({ id, ...data }: UpdateTerritoryInput) =>
      apiClient.patch<Territory>(`/crm/territories/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.territories() });
    },
  });
}

export function useDeleteTerritory() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "territories", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/territories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.territories() });
    },
  });
}

export function usePreviewTerritory() {
  return useMutation({
    mutationKey: ["crm-settings", "territories", "preview"],
    mutationFn: (sampleLead: {
      city?: string;
      state?: string;
      country?: string;
      industry?: string;
    }) =>
      apiClient.post<TerritoryPreviewResult>("/crm/territories/preview", {
        sample: sampleLead,
      }),
  });
}

export interface AssignmentPreviewResult {
  matchedRule: { id: number; name: string } | null;
  wouldAssignTo: string | null;
  trace: Array<{
    ruleId: number;
    ruleName: string;
    matched: boolean;
    reason: string;
  }>;
}

export function usePreviewAssignmentRule() {
  return useMutation({
    mutationKey: ["crm-settings", "assignment-rules", "preview"],
    mutationFn: (sampleLead: {
      source?: string;
      priority?: string;
      score?: number;
      city?: string;
    }) =>
      apiClient.post<AssignmentPreviewResult>("/crm/assignment-rules/preview", {
        sampleLead,
      }),
  });
}
