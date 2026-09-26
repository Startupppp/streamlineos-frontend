"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";

const hrKbLinkFlagsLazy = lazyContract(() =>
  import("@/hooks/api/kb/hr-link-config-schema").then((m) => m.hrKbLinkFlagsContract),
);

export interface HrKbLinkFlags {
  link: boolean;
  search: boolean;
  ai: boolean;
}

const adminLazy = lazyContract(() =>
  import("@/hooks/api/kb/linked-documents-schema").then((m) => m.hrKbLinkFlagsAdminContract),
);

export interface HrKbLinkFlagsAdmin {
  stored: HrKbLinkFlags;
  effective: HrKbLinkFlags;
  hrModuleEnabled: boolean;
}

const ALL_OFF: HrKbLinkFlags = { link: false, search: false, ai: false };

export function useHrKbLinkConfig() {
  return useGatedQuery("kb:pages:view", {
    queryKey: knowledgeAndSurveysQueryKeys.kb.hrLinkConfig(),
    queryFn: ({ signal }) =>
      apiClient.get<HrKbLinkFlags>("/kb/hr-link/config", undefined, signal, hrKbLinkFlagsLazy),
    staleTime: 60_000,
    ...INLINE_READ_ERROR,
  });
}

export function useHrKbLinkFlags(): HrKbLinkFlags {
  const { data } = useHrKbLinkConfig();
  return data ?? ALL_OFF;
}

export function useHrKbLinkFlagsAdmin() {
  return useGatedQuery("kb:settings:manage", {
    queryKey: knowledgeAndSurveysQueryKeys.kb.hrLinkFlagsAdmin(),
    queryFn: ({ signal }) =>
      apiClient.get<HrKbLinkFlagsAdmin>("/kb/settings/hr-link-flags", undefined, signal, adminLazy),
    staleTime: 60_000,
  });
}

export function useUpdateHrKbLinkFlags() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:settings:manage", {
    mutationKey: ["kb", "hrLinkFlags", "update"],
    mutationFn: (patch: Partial<HrKbLinkFlags>) =>
      apiClient.patch<HrKbLinkFlagsAdmin>("/kb/settings/hr-link-flags", patch, undefined, adminLazy),
    onSuccess: (result) => {
      qc.setQueryData(knowledgeAndSurveysQueryKeys.kb.hrLinkFlagsAdmin(), result);
      qc.setQueryData(knowledgeAndSurveysQueryKeys.kb.hrLinkConfig(), result.effective);
    },
  });
}
