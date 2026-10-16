"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accessAndCrmQueryKeys as queryKeys } from "@/lib/query-keys/access-and-crm";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useFeature } from "@/lib/billing/use-feature";
import type { WebForm, WebFormField } from "@/hooks/api/crm/web-forms-schema";

const schema = () => import("@/hooks/api/crm/web-forms-schema");
const listLazy = lazyContract(() => schema().then((m) => m.webFormListContract));
const formLazy = lazyContract(() => schema().then((m) => m.webFormContract));
const publicFormLazy = lazyContract(() => schema().then((m) => m.publicLeadFormContract));
const submitLazy = lazyContract(() => schema().then((m) => m.submitLeadFormContract));
const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export interface WebFormInput {
  name: string;
  description?: string | null;
  fields: WebFormField[];
  submitMessage?: string;
  redirectUrl?: string | null;
  isActive: boolean;
}

/**
 * The org's lead-capture forms. Gated on the key AND the plan feature: the
 * page shows the upgrade path instead of firing a read the plan does not cover.
 */
export function useWebForms() {
  const feature = useFeature("crm.web-forms");
  return useGatedQuery("crm:web-forms:manage", {
    queryKey: queryKeys.crmSettings.webForms(),
    queryFn: ({ signal }) => apiClient.get("/crm/web-forms", undefined, signal, listLazy),
    staleTime: 30_000,
    enabled: feature.enabled,
  });
}

function usePatchWebFormList() {
  const qc = useQueryClient();
  return (update: (forms: WebForm[]) => WebForm[]) =>
    qc.setQueryData<WebForm[]>(queryKeys.crmSettings.webForms(), (current) =>
      current ? update(current) : current,
    );
}

export function useCreateWebForm() {
  const patch = usePatchWebFormList();
  return useAuthorizedMutation("crm:web-forms:manage", {
    mutationKey: ["crm", "web-forms", "create"],
    mutationFn: (input: WebFormInput) =>
      apiClient.post("/crm/web-forms", input, undefined, formLazy),
    onSuccess: (created) => patch((forms) => [created, ...forms]),
  });
}

export function useUpdateWebForm() {
  const patch = usePatchWebFormList();
  return useAuthorizedMutation("crm:web-forms:manage", {
    mutationKey: ["crm", "web-forms", "update"],
    mutationFn: ({ id, ...input }: Partial<WebFormInput> & { id: number }) =>
      apiClient.patch(`/crm/web-forms/${id}`, input, undefined, formLazy),
    onSuccess: (updated) =>
      patch((forms) => forms.map((form) => (form.id === updated.id ? updated : form))),
  });
}

export function useDeleteWebForm() {
  const patch = usePatchWebFormList();
  return useAuthorizedMutation("crm:web-forms:manage", {
    mutationKey: ["crm", "web-forms", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<void>(`/crm/web-forms/${id}`, undefined, undefined, noContentLazy),
    onSuccess: (_, id) => patch((forms) => forms.filter((form) => form.id !== id)),
  });
}

/** Public: the form a visitor fills in. No session, no tenant. */
export function usePublicLeadForm(leadFormToken: string) {
  return useQuery({
    queryKey: queryKeys.publicLeadForm(leadFormToken),
    queryFn: async ({ signal }) =>
      (await apiClient.get(`/public/lead-form/${leadFormToken}`, undefined, signal, publicFormLazy)).form,
    enabled: leadFormToken.length > 0,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useSubmitLeadForm(leadFormToken: string) {
  return useMutation({
    mutationKey: ["public", "lead-form", "submit"],
    mutationFn: (values: Record<string, string>) =>
      apiClient.post(`/public/lead-form/${leadFormToken}`, values, undefined, submitLazy),
  });
}
