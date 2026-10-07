"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { useAddAttachment, useAddComment } from "@/hooks/api/build/ticket-sub-resources";
import { useCreateTicket } from "@/hooks/api/build/tickets";
import { useUpdateComment, useDeleteComment } from "@/hooks/api/build/comment-mutations";
import { useDeleteCommentDraftByTicket } from "@/hooks/api/build/comment-draft-commands";
import { useDraftCommentAction } from "./use-draft-comment-action";
import { useTicketCommentComposer } from "./use-ticket-comment-composer";
import { useAddReaction, useRemoveReaction } from "@/hooks/api/build/reactions";
import { useCan } from "@/hooks/api/access";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import type { TicketComment } from "@/types/projects";
import type { MentionUser } from "@/features/build/comments/mention-textarea";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { MAX_PROJECT_FILE_BYTES, useUploadProjectFile } from "@/hooks/api/build/project-files";

const COMMENT_RENDER_PAGE_SIZE = 20;

interface UseActivityFeedInput {
  ticketId: number;
  projectId: number;
  projectKey?: string | null;
  ticketNumber?: number | null;
  comments: TicketComment[];
  members?: MentionUser[];
  highlightCommentId?: number | null;
}

export function useActivityFeed({
  ticketId,
  projectId,
  projectKey,
  ticketNumber,
  comments,
  highlightCommentId,
}: UseActivityFeedInput) {
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingSaveId, setEditingSaveId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [commentNotFoundDismissed, setCommentNotFoundDismissed] = useState(false);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const commentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const deleteDraftByTicket = useDeleteCommentDraftByTicket();
  const canUpdate = useCan("build:tickets:update");
  const {
    body: newComment, change: setNewComment, clear: clearNewComment,
    ready: composerReady, loading: draftLoading, loadError: draftLoadError, retry: retryDraft,
    persistenceStatus: draftPersistenceStatus, persistenceError: draftPersistenceError, retryPersistence,
  } = useTicketCommentComposer(ticketId, canUpdate);
  const canCreate = useCan("build:tickets:create");
  const canAi = useCan("build:ai:use");
  const canAttachFiles = useCan("build:files:manage") && canUpdate;
  const uploadProjectFile = useUploadProjectFile(projectId);
  const addAttachment = useAddAttachment();
  const router = useRouter();
  const queryClient = useQueryClient();

  const commentPermalink = useCallback(
    (commentId: number) => {
      if (ticketNumber == null) return undefined;
      return getTicketDetailHref(projectId, projectKey, ticketNumber, commentId);
    },
    [projectId, projectKey, ticketNumber],
  );

  const commentNotFound =
    !commentNotFoundDismissed &&
    !!highlightCommentId &&
    comments.length > 0 &&
    !comments.some((c) => c.id === highlightCommentId);

  useEffect(() => {
    if (!highlightCommentId) return;
    const el = commentRefs.current.get(highlightCommentId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightCommentId, comments]);

  const addComment = useAddComment({
    onSuccess: () => { clearNewComment(); deleteDraftByTicket.mutate(ticketId); },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const addReply = useAddComment({
    onSuccess: () => { setReplyText(""); setReplyingTo(null); },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const addReaction = useAddReaction(projectId, ticketId);
  const removeReaction = useRemoveReaction(projectId, ticketId);

  const handleSubmit = useCallback(() => {
    const content = newComment.trim();
    if (!content) return;
    const optimisticAuthor = session?.user?.id
      ? { id: session.user.id, name: session.user.name ?? null, image: session.user.image ?? null }
      : undefined;
    addComment.mutate({ ticketId, projectId, content, optimisticAuthor });
  }, [newComment, ticketId, projectId, addComment, session]);

  const handleReplySubmit = useCallback(
    (commentId: number) => {
      const content = replyText.trim();
      if (!content) return;
      const optimisticAuthor = session?.user?.id
        ? { id: session.user.id, name: session.user.name ?? null, image: session.user.image ?? null }
        : undefined;
      addReply.mutate({ ticketId, projectId, content, parentCommentId: commentId, optimisticAuthor });
    },
    [replyText, ticketId, projectId, addReply, session],
  );

  const handleSaveEdit = useCallback(
    (commentId: number, content: string) => {
      setEditingSaveId(commentId);
      updateComment.mutate(
        { commentId, ticketId, projectId, content },
        {
          onSuccess: () => toast.success("Comment updated"),
          onError: (err) => toast.error(getErrorMessage(err)),
          onSettled: () => setEditingSaveId(null),
        },
      );
    },
    [updateComment, ticketId, projectId],
  );

  const handleDeleteComment = useCallback(
    (commentId: number) => {
      setDeletingId(commentId);
      deleteComment.mutate(
        { commentId, ticketId, projectId },
        {
          onSuccess: () => toast.success("Comment deleted"),
          onError: (err) => toast.error(getErrorMessage(err)),
          onSettled: () => setDeletingId(null),
        },
      );
    },
    [deleteComment, ticketId, projectId],
  );

  const handleTopKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); }
    },
    [handleSubmit],
  );

  const handleReplyKeyDown = useCallback(
    (parentId: number) => (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleReplySubmit(parentId); }
    },
    [handleReplySubmit],
  );

  const handleReply = useCallback((commentId: number) => { setReplyingTo(commentId); }, []);
  const handleReact = useCallback((commentId: number, emoji: string) => {
    if (!currentUserId) return;
    addReaction.mutate({ commentId, emoji, userId: currentUserId });
  }, [addReaction, currentUserId]);
  const handleUnreact = useCallback((commentId: number, emoji: string) => {
    if (!currentUserId) return;
    removeReaction.mutate({ commentId, emoji, userId: currentUserId });
  }, [removeReaction, currentUserId]);
  const handleCancelReply = useCallback(() => { setReplyingTo(null); setReplyText(""); }, []);
  const handleDismissNotFound = useCallback(() => setCommentNotFoundDismissed(true), []);

  const createTicket = useCreateTicket({
    onSuccess: (ticket) => {
      void queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.ticketActivity.list(ticketId), exact: true, refetchType: "none" });
      toast.success("Issue created");
      if (ticket.projectId != null && ticket.ticketNumber != null) {
        router.push(getTicketDetailHref(ticket.projectId, ticket.project?.key ?? projectKey, ticket.ticketNumber));
      }
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const handleCreateIssue = useCallback(
    (commentId: number, content: string) => {
      if (!projectId) return;
      const sourceRef = ticketNumber != null && projectKey ? `${projectKey}-${ticketNumber}` : `ticket #${ticketId}`;
      createTicket.mutate({
        projectId,
        title: `Issue from comment on ${sourceRef}`,
        description: `${content}\n\n---\nCreated from a comment on ${sourceRef} (comment #${commentId}).`,
        type: "TASK",
      });
    },
    [createTicket, projectId, ticketId, ticketNumber, projectKey],
  );

  const handleApplyDraft = useCallback((text: string) => setNewComment(text), [setNewComment]);
  const draftAction = useDraftCommentAction(ticketId, handleApplyDraft);
  const handleRetryDraft = useCallback(() => { void retryDraft(); }, [retryDraft]);
  const handleRetryPersistence = useCallback(() => { void retryPersistence(); }, [retryPersistence]);
  const handleAttachFiles = useCallback(async (files: File[]) => {
    const oversized = files.find((file) => file.size > MAX_PROJECT_FILE_BYTES);
    if (oversized) {
      toast.error(`${oversized.name} exceeds the 2 MB file limit.`);
      return;
    }
    try {
      for (const file of files) {
        const uploaded = await uploadProjectFile.mutateAsync(file);
        await addAttachment.mutateAsync({ ticketId, projectId, fileId: uploaded.id });
      }
      toast.success(files.length === 1 ? "File attached" : `${files.length} files attached`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [addAttachment, projectId, ticketId, uploadProjectFile]);

  const { repliesMap, sortedTopLevel } = useMemo(() => {
    const topLevel = comments.filter((c) => !c.parentCommentId);
    const built = comments.reduce<Record<number, TicketComment[]>>((acc, r) => {
      const parentId = r.parentCommentId;
      if (!parentId) return acc;
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push(r);
      return acc;
    }, {});
    const sortedTopLevel = [...topLevel].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );
    return { repliesMap: built, sortedTopLevel };
  }, [comments]);

  const [visibleCount, setVisibleCount] = useState(COMMENT_RENDER_PAGE_SIZE);
  const handleShowOlderComments = useCallback(() => setVisibleCount((count) => count + COMMENT_RENDER_PAGE_SIZE), []);

  const visibleTopLevel = useMemo(() => {
    let count = visibleCount;
    if (highlightCommentId) {
      const index = sortedTopLevel.findIndex(
        (comment) => comment.id === highlightCommentId || (repliesMap[comment.id] ?? []).some((reply) => reply.id === highlightCommentId),
      );
      if (index >= count) count = index + 1;
    }
    return sortedTopLevel.slice(0, count);
  }, [sortedTopLevel, repliesMap, visibleCount, highlightCommentId]);

  return {
    newComment, setNewComment, composerReady, draftLoading, draftLoadError,
    draftPersistenceStatus, draftPersistenceError,
    canUpdate, canCreate, canAi,
    currentUserId, commentRefs,
    replyingTo, replyText, setReplyText,
    editingSaveId, deletingId,
    commentNotFound,
    addComment, addReply,
    repliesMap, sortedTopLevel, visibleTopLevel,
    commentPermalink,
    draftAction,
    handleSubmit, handleReplySubmit, handleSaveEdit, handleDeleteComment,
    handleTopKeyDown, handleReplyKeyDown, handleReply, handleReact, handleUnreact,
    handleCancelReply, handleDismissNotFound, handleCreateIssue,
    handleApplyDraft, handleRetryDraft, handleRetryPersistence,
    canAttachFiles,
    isAttachingFiles: uploadProjectFile.isPending || addAttachment.isPending,
    handleAttachFiles,
    handleShowOlderComments,
  };
}
