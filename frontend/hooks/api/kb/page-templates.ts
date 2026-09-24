"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type KbPageTemplate = {
  id: number;
  orgId: string;
  name: string;
  icon: string | null;
  description: string | null;
  content: Record<string, unknown> | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateKbPageTemplateInput = {
  fromPageId: number;
  name: string;
  description?: string;
};

export type KbPageTemplatePage = {
  data: KbPageTemplate[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
};

const kbPageTemplateListPageContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-templates-schema").then(
    (m) => m.kbPageTemplateListPageContract,
  ),
);

const kbPageTemplateSingleContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-templates-schema").then((m) => m.kbPageTemplateSingleContract),
);

export function useKbPageTemplates() {
  const canViewPages = useCan("kb:pages:view");
  const query = useInfiniteQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageTemplates(),
    initialPageParam: NO_CURSOR_YET,
    queryFn: ({ signal, pageParam }) =>
      apiClient.get<KbPageTemplatePage>(
        "/kb/page-templates",
        pageParam !== undefined ? { cursor: pageParam } : undefined,
        signal,
        kbPageTemplateListPageContract,
      ),
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    enabled: canViewPages,
    staleTime: 300_000,
  });

  return {
    ...query,
    data: query.data?.pages.flatMap((page) => page.data),
  };
}

export function useCreateKbPageTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:templates:manage", {
    mutationKey: ["kb", "pageTemplates", "create"],
    mutationFn: (input: CreateKbPageTemplateInput) =>
      apiClient.post<KbPageTemplate>("/kb/page-templates", input, undefined, kbPageTemplateSingleContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.pageTemplates() });
    },
  });
}

export function useDeleteKbPageTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:templates:manage", {
    mutationKey: ["kb", "pageTemplates", "delete"],
    mutationFn: (templateId: number) =>
      apiClient.delete<void>(`/kb/page-templates/${templateId}`, undefined, undefined, noContentC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.pageTemplates() });
    },
  });
}
