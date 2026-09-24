"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";

const hrKbLinkFlagsLazy = lazyContract(() =>
  import("@/hooks/api/kb/hr-link-config-schema").then((m) => m.hrKbLinkFlagsContract),
);

export interface HrKbLinkFlags {
  link: boolean;
  search: boolean;
  ai: boolean;
}

const ALL_OFF: HrKbLinkFlags = { link: false, search: false, ai: false };

/** Every member may read it (the UI needs it to know whether to render the feature at all); a member of a tenant that never turned it on gets three `false`s. */
export function useHrKbLinkConfig() {
  return useGatedQuery("kb:pages:view", {
    queryKey: knowledgeAndSurveysQueryKeys.kb.hrLinkConfig(),
    queryFn: ({ signal }) =>
      apiClient.get<HrKbLinkFlags>("/kb/hr-link/config", undefined, signal, hrKbLinkFlagsLazy),
    staleTime: 60_000,
  });
}

/** The switches as plain booleans. Off until the answer arrives: a feature must never flash on for a tenant that has it off. */
export function useHrKbLinkFlags(): HrKbLinkFlags {
  const { data } = useHrKbLinkConfig();
  return data ?? ALL_OFF;
}
