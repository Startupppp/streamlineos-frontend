"use client";

import { useState, useEffect, useRef } from "react";
import { useSubmitGuard } from "@/hooks/common/use-submit-guard";
import { useSession } from "next-auth/react";
import {
  useAddComment,
} from "@/hooks/api/build/ticket-sub-resources";
import {
  useUpdateComment,
  useDeleteComment,
} from "@/hooks/api/build/comment-mutations";
import { useDeleteCommentDraftByTicket } from "@/hooks/api/build/comment-draft-commands";
import { useDraftCommentAction } from "./use-draft-comment-action";
import { useTicketCommentComposer } from "./use-ticket-comment-composer";
import { useAddReaction, useRemoveReaction } from "@/hooks/api/build/reactions";
import { useCan } from "@/hooks/api/access";
import { useTicketFileAttachment } from "./use-ticket-file-attachment";
import { useCreateIssueFromComment } from "./use-create-issue-from-comment";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import type { TicketComment } from "@/types/projects";
import type { MentionUser } from "@/features/build/comments/mention-textarea";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";

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
    body: newComment,
    change: setNewComment,
    clear: clearNewComment,
    ready: composerReady,
    loading: draftLoading,
    loadError: draftLoadError,
    retry: retryDraft,
    persistenceStatus: draftPersistenceStatus,
    persistenceError: draftPersistenceError,
    retryPersistence,
  } = useTicketCommentComposer(ticketId, canUpdate);
  const canCreate = useCan("build:tickets:create");
  const canAi = useCan("build:ai:use");
  const canAttachFiles = useCan("build:files:manage") && canUpdate;
  const { isAttachingFiles, handleAttachFiles } = useTicketFileAttachment({ ticketId, projectId });
  const { handleCreateIssue } = useCreateIssueFromComment({ ticketId, projectId, projectKey, ticketNumber });

  function commentPermalink(commentId: number) {
    if (ticketNumber == null) return undefined;
    return getTicketDetailHref(projectId, projectKey, ticketNumber, commentId);
  }

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
    onSuccess: () => {
      clearNewComment();
      deleteDraftByTicket.mutate(ticketId);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const addReply = useAddComment({
    onSuccess: () => {
      setReplyText("");
      setReplyingTo(null);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const addReaction = useAddReaction(projectId, ticketId);
  const removeReaction = useRemoveReaction(projectId, ticketId);

  async function handleSubmitInner() {
    const content = newComment.trim();
    if (!content) return;
    const optimisticAuthor = session?.user?.id
      ? {
          id: session.user.id,
          name: session.user.name ?? null,
          image: session.user.image ?? null,
        }
      : undefined;
    return addComment.mutateAsync({ ticketId, projectId, content, optimisticAuthor });
  }
  const commentSubmitGuard = useSubmitGuard(handleSubmitInner);
  const isPostingComment = addComment.isPending || commentSubmitGuard.isSubmitting;

  function handleSubmit() {
    void commentSubmitGuard.submit().catch(() => {});
  }

  function handleReplySubmit(commentId: number) {
    const content = replyText.trim();
    if (!content) return;
    const optimisticAuthor = session?.user?.id
      ? {
          id: session.user.id,
          name: session.user.name ?? null,
          image: session.user.image ?? null,
        }
      : undefined;
    addReply.mutate({
      ticketId,
      projectId,
      content,
      parentCommentId: commentId,
      optimisticAuthor,
    });
  }

  function handleSaveEdit(commentId: number, content: string) {
    setEditingSaveId(commentId);
    updateComment.mutate(
      { commentId, ticketId, projectId, content },
      {
        onSuccess: () => toast.success("Comment updated"),
        onError: (err) => toast.error(getErrorMessage(err)),
        onSettled: () => setEditingSaveId(null),
      },
    );
  }

  function handleDeleteComment(commentId: number) {
    setDeletingId(commentId);
    deleteComment.mutate(
      { commentId, ticketId, projectId },
      {
        onSuccess: () => toast.success("Comment deleted"),
        onError: (err) => toast.error(getErrorMessage(err)),
        onSettled: () => setDeletingId(null),
      },
    );
  }

  function handleTopKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleReplyKeyDown(parentId: number) {
    return (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleReplySubmit(parentId);
      }
    };
  }

  function handleReply(commentId: number) {
    setReplyingTo(commentId);
  }

  function handleReact(commentId: number, emoji: string) {
    if (!currentUserId) return;
    addReaction.mutate({ commentId, emoji, userId: currentUserId });
  }

  function handleUnreact(commentId: number, emoji: string) {
    if (!currentUserId) return;
    removeReaction.mutate({ commentId, emoji, userId: currentUserId });
  }

  function handleCancelReply() {
    setReplyingTo(null);
    setReplyText("");
  }

  function handleDismissNotFound() {
    setCommentNotFoundDismissed(true);
  }

  const draftAction = useDraftCommentAction(ticketId, (text) => setNewComment(text));

  const handleRetryDraft = () => void retryDraft();
  const handleRetryPersistence = () => void retryPersistence();

  const topLevel = comments.filter((c) => !c.parentCommentId);
  const repliesMap = comments.reduce<Record<number, TicketComment[]>>((acc, r) => {
    const parentId = r.parentCommentId;
    if (!parentId) return acc;
    if (!acc[parentId]) acc[parentId] = [];
    acc[parentId].push(r);
    return acc;
  }, {});
  const sortedTopLevel = [...topLevel].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );

  const [visibleCount, setVisibleCount] = useState(COMMENT_RENDER_PAGE_SIZE);

  function handleShowOlderComments() {
    setVisibleCount((count) => count + COMMENT_RENDER_PAGE_SIZE);
  }

  let count = visibleCount;
  if (highlightCommentId) {
    const index = sortedTopLevel.findIndex(
      (comment) =>
        comment.id === highlightCommentId ||
        (repliesMap[comment.id] ?? []).some(
          (reply) => reply.id === highlightCommentId,
        ),
    );
    if (index >= count) count = index + 1;
  }
  const visibleTopLevel = sortedTopLevel.slice(0, count);

  return {
    newComment,
    setNewComment,
    composerReady,
    draftLoading,
    draftLoadError,
    draftPersistenceStatus,
    draftPersistenceError,
    canUpdate,
    canCreate,
    canAi,
    currentUserId,
    commentRefs,
    replyingTo,
    replyText,
    setReplyText,
    editingSaveId,
    deletingId,
    commentNotFound,
    addComment,
    isPostingComment,
    addReply,
    repliesMap,
    sortedTopLevel,
    visibleTopLevel,
    commentPermalink,
    draftAction,
    handleSubmit,
    handleReplySubmit,
    handleSaveEdit,
    handleDeleteComment,
    handleTopKeyDown,
    handleReplyKeyDown,
    handleReply,
    handleReact,
    handleUnreact,
    handleCancelReply,
    handleDismissNotFound,
    handleCreateIssue,
    handleRetryDraft,
    handleRetryPersistence,
    canAttachFiles,
    isAttachingFiles,
    handleAttachFiles,
    handleShowOlderComments,
  };
}
