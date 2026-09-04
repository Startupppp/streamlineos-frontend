"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

export interface KbSource {
  id: number;
  kind: "file" | "note";
  title: string;
  mimeType: string | null;
  fileSize: number | null;
  fileUrl: string | null;
  status: "processing" | "ready" | "failed";
  chunkCount: number;
  errorMessage: string | null;
  spaceId: number | null;
  createdAt: string;
}

const POLL_MIN_MS = 3_000;
const POLL_MAX_MS = 60_000;
const POLL_DEADLINE_MS = 10 * 60_000;
const POLL_STEP_MS = 30_000;

/**
 * Bounded poll for indexing sources: 3s, doubling every 30s to a 60s ceiling, stopping after
 * 10 minutes. Elapsed time comes from the row's own createdAt so it survives remount, unlike
 * a ref or React Query's dataUpdatedAt (which is the last fetch and never grows).
 */
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

/**
 * `GET /kb/sources` was a hard cap of 100 with no cursor: a tenant past 100 sources could
 * never reach the rest, and the response was shaped exactly like a complete list, so
 * nothing surfaced the loss. It is a keyset page now, and this is an infinite query so the
 * cap is a page size rather than a ceiling.
 *
 * The poll still reads the flattened rows across every page, not just the first: a source
 * still ingesting on page two has to keep the poll alive, or the list a user has scrolled
 * into stops updating precisely where they are looking.
 */
export function useKbSources() {
  const canView = useCan("kb:pages:view");
  return useInfiniteQuery({
    queryKey: queryKeys.kb.sources(),
    queryFn: ({ pageParam, signal }) => {
      const params: Record<string, unknown> = { limit: SOURCES_PAGE_SIZE };
      if (pageParam !== undefined) params.cursor = pageParam;
      return apiClient.get<KbSourcePage>("/kb/sources", params, signal);
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 15_000,
    enabled: canView,
    refetchInterval: (query) =>
      kbSourcePollInterval((query.state.data?.pages ?? []).flatMap((page) => page.data)),
  });
}

/**
 * The key is minted per FILE, not per attempt, and released only on success: POST /kb/sources
 * is @Idempotent, each POST inserts a new kb_sources row, and a retry after the client's 30s
 * timeout would otherwise create a second row and pay for a second full embed batch. A File
 * does not survive JSON.stringify, so the operation signature names it explicitly.
 */
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
      return apiClient.upload<KbSource>("/kb/sources", fd, undefined, config);
    },
    onSuccess: () => {
      operation.settle();
      return qc.invalidateQueries({ queryKey: queryKeys.kb.sources() });
    },
  });
}

export function useCreateKbSourceNote() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("kb:pages:create", {
    mutationKey: ["create", "kb", "source", "note"],
    mutationFn: (input: { title: string; text: string }) =>
      apiClient.post<KbSource>("/kb/sources/note", input, operation.configFor(input)),
    onSuccess: () => {
      operation.settle();
      return qc.invalidateQueries({ queryKey: queryKeys.kb.sources() });
    },
  });
}

export function useDeleteKbSource() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:delete", {
    mutationKey: ["delete", "kb", "source"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/kb/sources/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.kb.sources() }),
  });
}
