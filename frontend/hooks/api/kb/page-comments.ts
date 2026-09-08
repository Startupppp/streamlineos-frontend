"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type KbPageComment = {
  id: number;
  orgId: string;
  pageId: number;
  authorId: string | null;
  authorName: string | null;
  parentId: number | null;
  content: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateKbPageCommentInput = {
  content: string;
  parentId?: number | null;
};

const kbPageCommentListContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-comments-schema").then((m) => m.kbPageCommentListContract),
);

const kbPageCommentContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-comments-schema").then((m) => m.kbPageCommentContract),
);

export function useKbPageComments(pageId: number) {
  const canViewPages = useCan("kb:pages:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageComments(pageId),
    queryFn: ({ signal }) => apiClient.get<KbPageComment[]>(`/kb/pages/${pageId}/comments`, undefined, signal, kbPageCommentListContract),
    staleTime: 30_000,
    enabled: canViewPages && pageId > 0,
  });
}

export function useCreateKbPageComment() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pageComments", "create"],
    mutationFn: ({ pageId, ...data }: CreateKbPageCommentInput & { pageId: number }) =>
      apiClient.post<KbPageComment>(`/kb/pages/${pageId}/comments`, data, undefined, kbPageCommentContract),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.pageComments(variables.pageId) });
    },
  });
}

export function useUpdateKbPageComment() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pageComments", "update"],
    mutationFn: ({ commentId, content }: { commentId: number; pageId: number; content: string }) =>
      apiClient.patch<KbPageComment>(`/kb/page-comments/${commentId}`, { content }, undefined, kbPageCommentContract),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.pageComments(variables.pageId) });
    },
  });
}

export function useDeleteKbPageComment() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pageComments", "delete"],
    mutationFn: ({ commentId }: { commentId: number; pageId: number }) =>
      apiClient.delete<void>(`/kb/page-comments/${commentId}`, undefined, undefined, noContentC),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.pageComments(variables.pageId) });
    },
  });
}

export function useResolveKbPageComment() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pageComments", "resolve"],
    mutationFn: ({ commentId }: { commentId: number; pageId: number }) =>
      apiClient.post<KbPageComment>(`/kb/page-comments/${commentId}/resolve`, undefined, undefined, kbPageCommentContract),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.pageComments(variables.pageId) });
    },
  });
}
