"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { invalidateHrWorkforceQueries } from "@/lib/hr-workforce-cache";

const onboardingStatusListC = lazyContract(() =>
  import("@/hooks/api/hr/onboarding-schema").then((m) => m.onboardingStatusListContract),
);
const onboardingTaskListC = lazyContract(() =>
  import("@/hooks/api/hr/onboarding-schema").then((m) => m.onboardingTaskListContract),
);
const completeOnboardingTaskC = lazyContract(() =>
  import("@/hooks/api/hr/onboarding-schema").then((m) => m.completeOnboardingTaskContract),
);
const initiateOnboardingC = lazyContract(() =>
  import("@/hooks/api/hr/onboarding-schema").then((m) => m.initiateOnboardingContract),
);
const onboardingTemplateDepartmentsC = lazyContract(() =>
  import("@/hooks/api/hr/onboarding-schema").then((m) => m.onboardingTemplateDepartmentsContract),
);
const onboardingTemplateListC = lazyContract(() =>
  import("@/hooks/api/hr/onboarding-schema").then((m) => m.onboardingTemplateListContract),
);
const createOnboardingTemplateC = lazyContract(() =>
  import("@/hooks/api/hr/onboarding-schema").then((m) => m.createOnboardingTemplateContract),
);
const myOnboardingDocsC = lazyContract(() =>
  import("@/hooks/api/hr/onboarding-schema").then((m) => m.myOnboardingDocsContract),
);
const submitOnboardingDocC = lazyContract(() =>
  import("@/hooks/api/hr/onboarding-schema").then((m) => m.submitOnboardingDocContract),
);

export interface OnboardingStatus {
  userId: string | null;
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
    queryKey: humanResourcesQueryKeys.hr.onboardingStatus(),
    queryFn: ({ signal }) => apiClient.get<OnboardingStatus[]>("/onboarding", undefined, signal, onboardingStatusListC),
    staleTime: 2 * 60_000,
    enabled: canManage,
  });
}


export function useUserOnboarding(userId: string) {
  const canViewTasks = useCan("hr:onboarding:tasks:view");
  return useQuery<OnboardingTask[]>({
    queryKey: humanResourcesQueryKeys.hr.onboardingUser(userId),
    queryFn: ({ signal }) => apiClient.get<OnboardingTask[]>(`/onboarding/${userId}`, undefined, signal, onboardingTaskListC),
    enabled: !!userId && canViewTasks,
    staleTime: 60_000,
  });
}

export function useMyOnboarding() {
  const canViewOwnTasks = useCan("self:onboarding-tasks");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<OnboardingTask[]>({
    queryKey: humanResourcesQueryKeys.hr.onboardingUser("me"),
    queryFn: ({ signal }) => apiClient.get<OnboardingTask[]>("/onboarding/me", undefined, signal, onboardingTaskListC),
    staleTime: 60_000,
    enabled: hrEnabled && canViewOwnTasks,
  });
}


export function useCompleteOnboardingTask() {
  const qc = useQueryClient();
  return useAuthorizedMutation("self:onboarding-tasks", {
    mutationKey: ["onboarding", "task", "complete"],
    mutationFn: ({ taskId, status }: { taskId: number; status: "COMPLETED" | "PENDING" }) =>
      apiClient.patch<{ success: boolean }>(`/onboarding/tasks/${taskId}`, { status }, undefined, completeOnboardingTaskC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.onboardingAll });
    },
  });
}


export function useInitiateOnboarding() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:onboarding:manage", {
    mutationKey: ["onboarding", "initiate"],
    mutationFn: (userId: string) =>
      apiClient.post<{ success: boolean; tasksCreated: number }>("/onboarding", { userId }, undefined, initiateOnboardingC),
    onSuccess: (_, userId) => invalidateHrWorkforceQueries(qc, userId),
  });
}

export interface OnboardingTemplateStep {
  title: string;
  description?: string | null;
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
    queryKey: humanResourcesQueryKeys.hr.onboardingTemplateDepartments(),
    queryFn: ({ signal }) =>
      apiClient.get<OnboardingTemplateDepartment[]>("/onboarding/templates/departments", undefined, signal, onboardingTemplateDepartmentsC),
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
    queryKey: humanResourcesQueryKeys.hr.onboardingTemplates(),
    queryFn: ({ signal }) => apiClient.get<OnboardingTemplate[]>("/onboarding/templates", undefined, signal, onboardingTemplateListC),
    staleTime: 2 * 60_000,
    enabled: canManage,
  });
}

export function useCreateHrOnboardingTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:onboarding:manage", {
    mutationKey: ["onboarding", "templates", "create"],
    mutationFn: (data: CreateOnboardingTemplateInput) =>
      apiClient.post<{ success: boolean; templateId: number }>("/onboarding/templates", data, undefined, createOnboardingTemplateC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.onboardingTemplates() });
    },
  });
}

export interface OnboardingChecklistDoc {
  id: number;
  orgId: string;
  userId: string;
  documentTypeId: number;
  documentTypeName: string;
  isMandatory: boolean;
  hasFile: boolean;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  version: number;
  status: "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED" | "RE_UPLOAD_REQUESTED";
  reviewedBy: string | null;
  reviewedAt: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  reviewerName: string | null;
}

interface OnboardingChecklistDocsResponse {
  data: OnboardingChecklistDoc[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export function useMyOnboardingDocList() {
  const canViewOwnDocs = useCan("self:onboarding-docs");
  return useQuery<OnboardingChecklistDoc[]>({
    queryKey: humanResourcesQueryKeys.hr.myOnboardingDocs(),
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<OnboardingChecklistDocsResponse>(
        "/hr/onboarding-docs/me",
        { limit: 100 },
        signal,
        myOnboardingDocsC,
      );
      return res.data;
    },
    staleTime: 60_000,
    enabled: canViewOwnDocs,
  });
}

export function useSubmitOnboardingDoc() {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, { documentTypeId: number; fileUrl: string; fileName: string }>("self:onboarding-docs", {
    mutationKey: ["hr", "onboarding-doc", "submit"],
    mutationFn: (body) => apiClient.post("/hr/onboarding-docs/me", body, undefined, submitOnboardingDocC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.myOnboardingDocs() });
    },
  });
}
