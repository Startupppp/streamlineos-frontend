"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { selectFlatPages } from "@/lib/api/select-flat-pages";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { kbPageKindSchema } from "./kb-pages-schema";

export const kbShortcutTargetSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  icon: z.string().nullable(),
  kind: kbPageKindSchema,
  spaceId: z.number().int().nullable(),
  status: z.string(),
});

export const kbShortcutItemSchema = z.object({
  id: z.number().int(),
  targetPageId: z.number().int(),
  createdAt: z.string(),
  state: z.enum(["available", "unavailable"]),
  target: kbShortcutTargetSchema.nullable(),
});

export const kbShortcutPageSchema = z.object({
  data: z.array(kbShortcutItemSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export type KbShortcutItem = z.infer<typeof kbShortcutItemSchema>;
export type KbShortcutPage = z.infer<typeof kbShortcutPageSchema>;

const shortcutItemContract = lazyContract(() =>
  Promise.resolve(kbShortcutItemSchema),
);

const shortcutPageContract = lazyContract(() =>
  Promise.resolve(kbShortcutPageSchema),
);

const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export function useKbShortcuts(options?: { enabled?: boolean }) {
  const canView = useCan("kb:pages:view");
  return useInfiniteQuery({
    ...INLINE_READ_ERROR,
    queryKey: knowledgeAndSurveysQueryKeys.kb.shortcuts(),
    initialPageParam: NO_CURSOR_YET,
    queryFn: ({ signal, pageParam }) =>
      apiClient.get<KbShortcutPage>(
        "/kb/shortcuts",
        pageParam !== undefined ? { cursor: pageParam, limit: 50 } : { limit: 50 },
        signal,
        shortcutPageContract,
      ),
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    select: selectFlatPages,
    staleTime: 30_000,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function useCreateKbShortcut() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "shortcuts", "create"],
    mutationFn: (targetPageId: number) =>
      apiClient.post<KbShortcutItem>(
        "/kb/shortcuts",
        { targetPageId },
        undefined,
        shortcutItemContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.shortcuts(),
        refetchType: "active",
      });
    },
  });
}

export function useDeleteKbShortcut() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "shortcuts", "delete"],
    mutationFn: (shortcutId: number) =>
      apiClient.delete(`/kb/shortcuts/${shortcutId}`, undefined, undefined, noContentContract),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.shortcuts(),
        refetchType: "active",
      });
    },
  });
}
