"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { invalidateHrWorkforceQueries } from "@/lib/hr-workforce-cache";

export interface OnboardingStatus {
  userId: string;
  userName: string;
  totalTasks: number;
  completedTasks: number;
  percentComplete: number;
  lastCompletedAt: string | null;
}

export interface OnboardingTask {
  id: number;
  userId: string;
  orgId: string;
  templateStepId: number | null;
  title: string;
  description: string | null;
  ownerRole: string;
  dueDate: string | null;
  status: string;
  completedAt: string | null;
  completedBy: string | null;
  createdAt: string | null;
  /** Computed by the API from the task owner and the caller's effective permissions/scope. */
  canComplete: boolean;
}

export function useOnboardingStatus() {
  const canManage = useCan("hr:onboarding:manage");
  return useQuery<OnboardingStatus[]>({
    queryKey: queryKeys.hr.onboardingStatus(),
    queryFn: ({ signal }) => apiClient.get<OnboardingStatus[]>("/onboarding", undefined, signal),
    staleTime: 2 * 60_000,
    enabled: canManage,
  });
}


export function useUserOnboarding(userId: string) {
  const canViewTasks = useCan("hr:onboarding:tasks:view");
  return useQuery<OnboardingTask[]>({
    queryKey: queryKeys.hr.onboardingUser(userId),
    queryFn: ({ signal }) => apiClient.get<OnboardingTask[]>(`/onboarding/${userId}`, undefined, signal),
    enabled: !!userId && canViewTasks,
    staleTime: 60_000,
  });
}

export function useMyOnboarding() {
  const canViewOwnTasks = useCan("self:onboarding-tasks");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<OnboardingTask[]>({
    queryKey: queryKeys.hr.onboardingUser("me"),
    queryFn: ({ signal }) => apiClient.get<OnboardingTask[]>("/onboarding/me", undefined, signal),
    staleTime: 60_000,
    enabled: hrEnabled && canViewOwnTasks,
  });
}


export function useCompleteOnboardingTask() {
  const qc = useQueryClient();
  return useAuthorizedMutation("self:onboarding-tasks", {
    mutationKey: ["onboarding", "task", "complete"],
    mutationFn: ({ taskId, status }: { taskId: number; status: "COMPLETED" | "PENDING" }) =>
      apiClient.patch<{ success: boolean }>(`/onboarding/tasks/${taskId}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.onboardingAll });
    },
  });
}


export function useInitiateOnboarding() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:onboarding:manage", {
    mutationKey: ["onboarding", "initiate"],
    mutationFn: (userId: string) =>
      apiClient.post<{ success: boolean; tasksCreated: number }>("/onboarding", { userId }),
    onSuccess: (_, userId) => invalidateHrWorkforceQueries(qc, userId),
  });
}

export interface OnboardingTemplateStep {
  title: string;
  description?: string;
  ownerRole: string;
  dueOffsetDays: number;
  isRequired: boolean;
  isComplianceItem: boolean;
}

export interface OnboardingTemplate {
  id: number;
  orgId: string;
  name: string;
  departmentId: string | null;
  description: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  steps: (OnboardingTemplateStep & { id: number; sortOrder: number })[];
}

export interface CreateOnboardingTemplateInput {
  name: string;
  departmentId?: string;
  description?: string;
  steps: OnboardingTemplateStep[];
}

export interface OnboardingTemplateDepartment {
  id: string;
  name: string;
}

export function useOnboardingTemplateDepartments() {
  const canManage = useCan("hr:onboarding:manage");
  return useQuery<OnboardingTemplateDepartment[]>({
    queryKey: queryKeys.hr.onboardingTemplateDepartments(),
    queryFn: ({ signal }) =>
      apiClient.get<OnboardingTemplateDepartment[]>("/onboarding/templates/departments", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: canManage,
  });
}

// Named Hr* to avoid collision with hooks/api/crm/clients.ts's client-onboarding
// useOnboardingTemplates/useCreateOnboardingTemplate (a different feature: CRM client
// onboarding, /clients/onboarding/templates — unrelated to employee onboarding plans).
export function useHrOnboardingTemplates() {
  const canManage = useCan("hr:onboarding:manage");
  return useQuery<OnboardingTemplate[]>({
    queryKey: queryKeys.hr.onboardingTemplates(),
    queryFn: ({ signal }) => apiClient.get<OnboardingTemplate[]>("/onboarding/templates", undefined, signal),
    staleTime: 2 * 60_000,
    enabled: canManage,
  });
}

export function useCreateHrOnboardingTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:onboarding:manage", {
    mutationKey: ["onboarding", "templates", "create"],
    mutationFn: (data: CreateOnboardingTemplateInput) =>
      apiClient.post<OnboardingTemplate>("/onboarding/templates", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.onboardingTemplates() });
    },
  });
}


