"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import type { ChangelogType, ChangelogEntry } from "@/types/projects";
import { keepPreviousData } from "@tanstack/react-query";

const changelogPageContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.changelogPageContract),
);
const changelogEntryContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.changelogEntryContract),
);
const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

interface CursorPaginated<T> {
  data: T[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

interface ChangelogFilters {
  type?: ChangelogType;
  cursor?: string;
  limit?: number;
}

interface CreateChangelogEntryInput {
  title: string;
  content?: string;
  version?: string;
  type?: ChangelogType;
  isPublished?: boolean;
  linkedRoadmapItemId?: number;
}

interface UpdateChangelogEntryInput {
  title?: string;
  content?: string;
  version?: string | null;
  type?: ChangelogType;
  isPublished?: boolean;
  linkedRoadmapItemId?: number | null;
}

export function useChangelog(filters: ChangelogFilters = {}) {
  const params: Record<string, unknown> = { ...filters };
  const canView = useCan("build:roadmap:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.roadmap.changelog(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPaginated<ChangelogEntry>>(
        "/build/changelog",
        params,
        signal,
        changelogPageContract,
      ),
    enabled: canView,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateChangelogEntry() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "changelog", "create"],
    mutationFn: (input: CreateChangelogEntryInput) =>
      apiClient.post<ChangelogEntry>(
        "/build/changelog",
        input,
        undefined,
        changelogEntryContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.roadmap.changelog(),
      }),
  });
}

export function useUpdateChangelogEntry() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "changelog", "update"],
    mutationFn: ({
      entryId,
      ...input
    }: UpdateChangelogEntryInput & { entryId: number }) =>
      apiClient.patch<ChangelogEntry>(
        `/build/changelog/${entryId}`,
        input,
        undefined,
        changelogEntryContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.roadmap.changelog(),
      }),
  });
}

export function useDeleteChangelogEntry() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:roadmap:manage", {
    mutationKey: ["projects", "changelog", "delete"],
    mutationFn: (entryId: number) =>
      apiClient.delete<void>(
        `/build/changelog/${entryId}`,
        undefined,
        undefined,
        noContentLazy,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.roadmap.changelog(),
      }),
  });
}
