"use client";
import type { z } from "zod";
import type { executiveBriefGetLatestContract } from "@/lib/api/hooks/executive-brief-schema";

import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { lazyContract } from "@/lib/api-envelope";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { streamAiText, type AiTextStreamRequest } from "@/hooks/api/ai-text-stream";
import { briefCitationsSchema, type BriefCitation } from "./executive-brief-schema";

export type { BriefCitation } from "./executive-brief-schema";

export interface ExecutiveBriefSnapshot {
  narrative: string;
  citations: BriefCitation[];
  uncertaintyNotes: string[];
  generatedAt: string;
  aiUsage?: AiUsageMeta | null;
}

export type LatestBriefResponse = z.infer<typeof executiveBriefGetLatestContract>;

const executiveBriefContract = lazyContract(() =>
  import("@/lib/api/hooks/executive-brief-schema").then((m) => m.executiveBriefGetLatestContract),
);

const briefQueryOptions = queryOptions({
  queryKey: platformCoreQueryKeys.executiveBrief,
  queryFn: ({ signal }) => apiClient.get<LatestBriefResponse>("/ai/executive-brief", undefined, signal, executiveBriefContract),
  staleTime: 5 * 60 * 1000,
});

export function useExecutiveBrief() {
  return useGatedQuery("ai:executive-brief:view", briefQueryOptions);
}

export function useGenerateBrief() {
  const qc = useQueryClient();
  return useAuthorizedMutation("ai:executive-brief:generate", {
    mutationKey: ["executive-brief", "generate"],
    mutationFn: (input: Pick<AiTextStreamRequest, "signal" | "onToken" | "onHeaders">) =>
      streamAiText({ path: "/ai/executive-brief/stream-generate", body: {}, ...input }),
    onSuccess: async (result) => {
      if (result.status === "completed")
        await qc.invalidateQueries({ queryKey: briefQueryOptions.queryKey });
    },
  });
}

export function readBriefSources(headers: Headers): BriefCitation[] {
  const value = headers.get("x-ai-sources");
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value));
    const result = briefCitationsSchema.safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}
