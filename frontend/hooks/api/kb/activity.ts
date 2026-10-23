"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { selectFlatPages } from "@/lib/api/select-flat-pages";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

const kbActivityActorSchema = z.object({
  membershipId: z.number().int(),
  name: z.string(),
});

export const kbActivityEntrySchema = z.object({
  id: z.number().int(),
  action: z.string(),
  at: z.string(),
  actorKind: z.enum(["member", "guest", "link", "system"]),
  actor: kbActivityActorSchema.nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

export const kbActivityPageSchema = z.object({
  data: z.array(kbActivityEntrySchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export type KbActivityPage = z.infer<typeof kbActivityPageSchema>;

const activityPageContract = lazyContract(() =>
  Promise.resolve(kbActivityPageSchema),
);

export function useKbPageActivity(pageId: number, options?: { enabled?: boolean }) {
  const canEdit = useCan("kb:pages:update");
  return useInfiniteQuery({
    ...INLINE_READ_ERROR,
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageActivity(pageId),
    initialPageParam: NO_CURSOR_YET,
    queryFn: ({ signal, pageParam }) =>
      apiClient.get<KbActivityPage>(
        `/kb/pages/${pageId}/activity`,
        pageParam !== undefined ? { cursor: pageParam, limit: 50 } : { limit: 50 },
        signal,
        activityPageContract,
      ),
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    select: selectFlatPages,
    staleTime: 30_000,
    enabled: canEdit && pageId > 0 && (options?.enabled ?? true),
  });
}
