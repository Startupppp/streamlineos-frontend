"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";


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
}

export function useOnboardingStatus() {
  return useQuery<OnboardingStatus[]>({
    queryKey: queryKeys.hr.onboardingStatus(),
    queryFn: () => apiClient.get<OnboardingStatus[]>("/onboarding"),
    staleTime: 2 * 60_000,
  });
}


export function useUserOnboarding(userId: string) {
  return useQuery<OnboardingTask[]>({
    queryKey: queryKeys.hr.onboardingUser(userId),
    queryFn: () => apiClient.get<OnboardingTask[]>(`/onboarding/${userId}`),
    enabled: !!userId,
    staleTime: 60_000,
  });
}


export function useCompleteOnboardingTask() {
  const qc = useQueryClient();
  return useMutation({
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
  return useMutation({
    mutationKey: ["onboarding", "initiate"],
    mutationFn: (userId: string) =>
      apiClient.post<{ success: boolean; tasksCreated: number }>("/onboarding", { userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.onboardingStatus() });
    },
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
  return useQuery<OnboardingTemplateDepartment[]>({
    queryKey: queryKeys.hr.onboardingTemplateDepartments(),
    queryFn: () =>
      apiClient.get<OnboardingTemplateDepartment[]>("/onboarding/templates/departments"),
    staleTime: 5 * 60_000,
  });
}

// Named Hr* to avoid collision with hooks/api/crm/clients.ts's client-onboarding
// useOnboardingTemplates/useCreateOnboardingTemplate (a different feature: CRM client
// onboarding, /clients/onboarding/templates — unrelated to employee onboarding plans).
export function useHrOnboardingTemplates() {
  return useQuery<OnboardingTemplate[]>({
    queryKey: queryKeys.hr.onboardingTemplates(),
    queryFn: () => apiClient.get<OnboardingTemplate[]>("/onboarding/templates"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateHrOnboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["onboarding", "templates", "create"],
    mutationFn: (data: CreateOnboardingTemplateInput) =>
      apiClient.post<OnboardingTemplate>("/onboarding/templates", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.onboardingTemplates() });
    },
  });
}


