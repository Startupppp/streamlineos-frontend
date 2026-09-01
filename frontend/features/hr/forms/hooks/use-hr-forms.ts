"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  CreateHrFormPayload,
  HrForm,
  HrFormListResponse,
  UpdateHrFormPayload,
} from "../lib/types";

const FORMS_KEY = ["hr", "forms"] as const;

function formKeys(params?: Record<string, unknown>) {
  return params ? [...FORMS_KEY, params] : FORMS_KEY;
}

export function useHrForms(params?: { status?: string; audience?: string; cursor?: string; limit?: number }) {
  return useQuery<HrFormListResponse>({
    queryKey: formKeys(params),
    queryFn: () => {
      const p: Record<string, unknown> = {};
      if (params?.status) p["status"] = params.status;
      if (params?.audience) p["audience"] = params.audience;
      if (params?.cursor) p["cursor"] = params.cursor;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get<HrFormListResponse>("/hr/forms", p);
    },
    staleTime: 30_000,
  });
}

export function useHrForm(formId: number | undefined) {
  return useQuery<HrForm>({
    queryKey: [...FORMS_KEY, formId],
    queryFn: ({ signal }) => apiClient.get<HrForm>(`/hr/forms/${formId}`, undefined, signal),
    enabled: formId !== undefined,
    staleTime: 30_000,
  });
}

export function useCreateHrForm() {
  const qc = useQueryClient();
  return useMutation<HrForm, Error, CreateHrFormPayload>({
    mutationKey: ["hr", "forms", "create"],
    mutationFn: (payload) => apiClient.post<HrForm>("/hr/forms", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: FORMS_KEY }),
  });
}

export function useUpdateHrForm(formId: number) {
  const qc = useQueryClient();
  return useMutation<HrForm, Error, UpdateHrFormPayload>({
    mutationKey: ["hr", "forms", "update", formId],
    mutationFn: (payload) =>
      apiClient.patch<HrForm>(`/hr/forms/${formId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FORMS_KEY });
      qc.invalidateQueries({ queryKey: [...FORMS_KEY, formId] });
    },
  });
}

export function useActivateHrForm() {
  const qc = useQueryClient();
  return useMutation<HrForm, Error, number>({
    mutationKey: ["hr", "forms", "activate"],
    mutationFn: (formId) =>
      apiClient.post<HrForm>(`/hr/forms/${formId}/activate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: FORMS_KEY }),
  });
}

export function useArchiveHrForm() {
  const qc = useQueryClient();
  return useMutation<HrForm, Error, number>({
    mutationKey: ["hr", "forms", "archive"],
    mutationFn: (formId) =>
      apiClient.post<HrForm>(`/hr/forms/${formId}/archive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: FORMS_KEY }),
  });
}

export function useDeleteHrForm() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationKey: ["hr", "forms", "delete"],
    mutationFn: (formId) => apiClient.delete<void>(`/hr/forms/${formId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: FORMS_KEY }),
  });
}
