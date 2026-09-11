"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

export interface KbSource {
  id: number;
  kind: string;
  title: string;
  mimeType: string | null;
  fileSize: number | null;
  fileUrl: string | null;
  status: string;
  chunkCount: number;
  errorMessage: string | null;
  spaceId: number | null;
  createdAt: string;
}

const POLL_MIN_MS = 3_000;
const POLL_MAX_MS = 60_000;
const POLL_DEADLINE_MS = 10 * 60_000;
const POLL_STEP_MS = 30_000;

export function kbSourcePollInterval(
  sources: readonly KbSource[] | undefined,
  now: number = Date.now(),
): number | false {
  const oldestProcessing = (sources ?? [])
    .filter((s) => s.status === "processing")
    .reduce<number | null>((oldest, s) => {
      const started = Date.parse(s.createdAt);
      if (Number.isNaN(started)) return oldest;
      return oldest === null || started < oldest ? started : oldest;
    }, null);

  if (oldestProcessing === null) return false;

  const waited = Math.max(0, now - oldestProcessing);
  if (waited >= POLL_DEADLINE_MS) return false;
  return Math.min(POLL_MIN_MS * 2 ** Math.floor(waited / POLL_STEP_MS), POLL_MAX_MS);
}

export interface KbSourcePage {
  data: KbSource[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

const SOURCES_PAGE_SIZE = 50;

const kbSourcePageContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-sources-schema").then((m) => m.kbSourcePageContract),
);

const kbSourceContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-sources-schema").then((m) => m.kbSourceContract),
);

const kbSourceSuccessContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-sources-schema").then((m) => m.kbSourceSuccessContract),
);

export function useKbSources() {
  const canView = useCan("kb:pages:view");
  return useInfiniteQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.sources(),
    queryFn: ({ pageParam, signal }) => {
      const params: Record<string, unknown> = { limit: SOURCES_PAGE_SIZE };
      if (pageParam !== undefined) params.cursor = pageParam;
      return apiClient.get<KbSourcePage>("/kb/sources", params, signal, kbSourcePageContract);
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 15_000,
    enabled: canView,
    refetchInterval: (query) =>
      kbSourcePollInterval((query.state.data?.pages ?? []).flatMap((page) => page.data)),
  });
}

export function useUploadKbSource() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("kb:pages:create", {
    mutationKey: ["kb", "sources", "upload"],
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const config = operation.configFor({
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
      });
      return apiClient.upload<KbSource>("/kb/sources", fd, kbSourceContract, config);
    },
    onSuccess: () => {
      operation.settle();
      return qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.sources() });
    },
  });
}

export function useCreateKbSourceNote() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("kb:pages:create", {
    mutationKey: ["create", "kb", "source", "note"],
    mutationFn: (input: { title: string; text: string }) =>
      apiClient.post<KbSource>("/kb/sources/note", input, operation.configFor(input), kbSourceContract),
    onSuccess: () => {
      operation.settle();
      return qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.sources() });
    },
  });
}

export function useDeleteKbSource() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:delete", {
    mutationKey: ["delete", "kb", "source"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/kb/sources/${id}`, undefined, undefined, kbSourceSuccessContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.sources() }),
  });
}
