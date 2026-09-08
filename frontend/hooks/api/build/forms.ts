"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type {
  ProjectForm,
  FormSubmission,
  CreateFormInput,
  UpdateFormInput,
  SubmitFormInput,
  SubmitFormResponse,
  UpdateSubmissionInput,
  FormType,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";


const formListContract = lazyContract(() =>
  import("@/hooks/api/build/forms-schema").then((m) => m.formListContract),
);
const formRowContract = lazyContract(() =>
  import("@/hooks/api/build/forms-schema").then((m) => m.formRowContract),
);
const submissionListContract = lazyContract(() =>
  import("@/hooks/api/build/forms-schema").then((m) => m.submissionListContract),
);
const submissionCreateResultContract = lazyContract(() =>
  import("@/hooks/api/build/forms-schema").then((m) => m.submissionCreateResultContract),
);
const submissionRowContract = lazyContract(() =>
  import("@/hooks/api/build/forms-schema").then((m) => m.submissionRowContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

interface FormFilters {
  type?: FormType;
  isActive?: boolean;
}

export function useForms(projectId: number, filters?: FormFilters) {
  const canView = useCan("build:forms:view");
  const params: Record<string, string> = {};
  if (filters?.type) params["type"] = filters.type;
  if (filters?.isActive !== undefined) params["isActive"] = String(filters.isActive);

  return useQuery<ProjectForm[]>({
    queryKey: buildWorkQueryKeys.projects.forms.list(
      projectId,
      Object.keys(params).length > 0 ? params : undefined,
    ),
    queryFn: ({ signal }) => apiClient.get<ProjectForm[]>(`/build/${projectId}/forms`, params, signal, formListContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useForm(projectId: number, formId: number) {
  const canView = useCan("build:forms:view");
  return useQuery<ProjectForm>({
    queryKey: buildWorkQueryKeys.projects.forms.detail(projectId, formId),
    queryFn: ({ signal }) => apiClient.get<ProjectForm>(`/build/${projectId}/forms/${formId}`, undefined, signal, formRowContract),
    enabled: canView && !!projectId && !!formId,
    staleTime: 60_000,
  });
}

export function useCreateForm(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:forms:manage", {
    mutationKey: ["projects", projectId, "forms", "create"],
    mutationFn: (data: CreateFormInput) =>
      apiClient.post<ProjectForm>(`/build/${projectId}/forms`, data, undefined, formRowContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.forms.list(projectId) });
    },
  });
}

export function useUpdateForm(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:forms:manage", {
    mutationKey: ["projects", projectId, "forms", "update"],
    mutationFn: ({ id, ...data }: UpdateFormInput & { id: number }) =>
      apiClient.patch<ProjectForm>(`/build/${projectId}/forms/${id}`, data, undefined, formRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.forms.list(projectId) });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.forms.detail(projectId, vars.id) });
    },
  });
}

export function useDeleteForm(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:forms:manage", {
    mutationKey: ["projects", projectId, "forms", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<void>(`/build/${projectId}/forms/${id}`, undefined, undefined, noContentContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.forms.list(projectId) });
    },
  });
}

export function useFormSubmissions(projectId: number, formId: number) {
  const canManage = useCan("build:forms:manage");
  return useQuery<FormSubmission[]>({
    queryKey: buildWorkQueryKeys.projects.forms.submissions(projectId, formId),
    queryFn: ({ signal }) =>
      apiClient.get<FormSubmission[]>(`/build/${projectId}/forms/${formId}/submissions`, undefined, signal, submissionListContract),
    enabled: canManage && !!projectId && !!formId,
    staleTime: 60_000,
  });
}

export function useSubmitForm(projectId: number, formId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:forms:view", {
    mutationKey: ["projects", projectId, "forms", formId, "submit"],
    mutationFn: (data: SubmitFormInput) =>
      apiClient.post<SubmitFormResponse>(
        `/build/${projectId}/forms/${formId}/submissions`,
        data,
        undefined,
        submissionCreateResultContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.forms.submissions(projectId, formId),
      });
    },
  });
}

export function useUpdateSubmission(projectId: number, formId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:forms:manage", {
    mutationKey: ["projects", projectId, "forms", formId, "submission", "update"],
    mutationFn: ({ submissionId, ...data }: UpdateSubmissionInput & { submissionId: number }) =>
      apiClient.patch<FormSubmission>(
        `/build/${projectId}/forms/${formId}/submissions/${submissionId}`,
        data,
        undefined,
        submissionRowContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.forms.submissions(projectId, formId),
      });
    },
  });
}
