"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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

interface FormFilters {
  type?: FormType;
  isActive?: boolean;
}

export function useForms(projectId: number, filters?: FormFilters) {
  const params: Record<string, string> = {};
  if (filters?.type) params["type"] = filters.type;
  if (filters?.isActive !== undefined) params["isActive"] = String(filters.isActive);

  return useQuery<ProjectForm[]>({
    queryKey: queryKeys.projects.forms.list(
      projectId,
      Object.keys(params).length > 0 ? params : undefined,
    ),
    queryFn: () => apiClient.get<ProjectForm[]>(`/build/${projectId}/forms`, params),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useForm(projectId: number, formId: number) {
  return useQuery<ProjectForm>({
    queryKey: queryKeys.projects.forms.detail(projectId, formId),
    queryFn: () => apiClient.get<ProjectForm>(`/build/${projectId}/forms/${formId}`),
    enabled: !!projectId && !!formId,
    staleTime: 60_000,
  });
}

export function useCreateForm(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "forms", "create"],
    mutationFn: (data: CreateFormInput) =>
      apiClient.post<ProjectForm>(`/build/${projectId}/forms`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.forms.list(projectId) });
    },
  });
}

export function useUpdateForm(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "forms", "update"],
    mutationFn: ({ id, ...data }: UpdateFormInput & { id: number }) =>
      apiClient.patch<ProjectForm>(`/build/${projectId}/forms/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.forms.list(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.forms.detail(projectId, vars.id) });
    },
  });
}

export function useDeleteForm(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "forms", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/build/${projectId}/forms/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.forms.list(projectId) });
    },
  });
}

export function useFormSubmissions(projectId: number, formId: number) {
  return useQuery<FormSubmission[]>({
    queryKey: queryKeys.projects.forms.submissions(projectId, formId),
    queryFn: () =>
      apiClient.get<FormSubmission[]>(`/build/${projectId}/forms/${formId}/submissions`),
    enabled: !!projectId && !!formId,
    staleTime: 60_000,
  });
}

export function useSubmitForm(projectId: number, formId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "forms", formId, "submit"],
    mutationFn: (data: SubmitFormInput) =>
      apiClient.post<SubmitFormResponse>(
        `/build/${projectId}/forms/${formId}/submissions`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.projects.forms.submissions(projectId, formId),
      });
    },
  });
}

export function useUpdateSubmission(projectId: number, formId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "forms", formId, "submission", "update"],
    mutationFn: ({ submissionId, ...data }: UpdateSubmissionInput & { submissionId: number }) =>
      apiClient.patch<FormSubmission>(
        `/build/${projectId}/forms/${formId}/submissions/${submissionId}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.projects.forms.submissions(projectId, formId),
      });
    },
  });
}
