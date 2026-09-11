"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type {
  CreateHrFormPayload,
  UpdateHrFormPayload,
} from "../lib/types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const formListContract = lazyContract(() =>
  import("@/features/hr/forms/hooks/hr-forms-schema").then((m) => m.hrFormListContract),
);
const formRowContract = lazyContract(() =>
  import("@/features/hr/forms/hooks/hr-forms-schema").then((m) => m.hrFormRowContract),
);
const formDeleteContract = lazyContract(() =>
  import("@/features/hr/forms/hooks/hr-forms-schema").then((m) => m.hrFormDeleteContract),
);

const FORMS_KEY = ["hr", "forms"] as const;

function formKeys(params?: Record<string, unknown>) {
  return params ? [...FORMS_KEY, params] : FORMS_KEY;
}

export function useHrForms(params?: { status?: string; audience?: string; cursor?: string; limit?: number }) {
  const canViewForms = useCan("hr:forms:view");
  return useQuery({
    queryKey: formKeys(params),
    queryFn: ({ signal }) => {
      const p: Record<string, unknown> = {};
      if (params?.status) p["status"] = params.status;
      if (params?.audience) p["audience"] = params.audience;
      if (params?.cursor) p["cursor"] = params.cursor;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get("/hr/forms", p, signal, formListContract);
    },
    staleTime: 30_000,
    enabled: canViewForms,
  });
}

export function useHrForm(formId: number | undefined) {
  const canViewForms = useCan("hr:forms:view");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrFormsAll, formId],
    queryFn: ({ signal }) => apiClient.get(`/hr/forms/${formId}`, undefined, signal, formRowContract),
    enabled: canViewForms && formId !== undefined,
    staleTime: 30_000,
  });
}

export function useCreateHrForm() {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, CreateHrFormPayload>("hr:forms:manage", {
    mutationKey: ["hr", "forms", "create"],
    mutationFn: (payload) => apiClient.post("/hr/forms", payload, undefined, formRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: FORMS_KEY }),
  });
}

export function useUpdateHrForm(formId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, UpdateHrFormPayload>("hr:forms:manage", {
    mutationKey: ["hr", "forms", "update", formId],
    mutationFn: (payload) =>
      apiClient.patch(`/hr/forms/${formId}`, payload, undefined, formRowContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FORMS_KEY });
      qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.hrFormsAll, formId] });
    },
  });
}

export function useActivateHrForm() {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, number>("hr:forms:manage", {
    mutationKey: ["hr", "forms", "activate"],
    mutationFn: (formId) =>
      apiClient.post(`/hr/forms/${formId}/activate`, undefined, undefined, formRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: FORMS_KEY }),
  });
}

export function useArchiveHrForm() {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, number>("hr:forms:manage", {
    mutationKey: ["hr", "forms", "archive"],
    mutationFn: (formId) =>
      apiClient.post(`/hr/forms/${formId}/archive`, undefined, undefined, formRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: FORMS_KEY }),
  });
}

export function useDeleteHrForm() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("hr:forms:manage", {
    mutationKey: ["hr", "forms", "delete"],
    mutationFn: (formId) => apiClient.delete(`/hr/forms/${formId}`, undefined, undefined, formDeleteContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: FORMS_KEY }),
  });
}
