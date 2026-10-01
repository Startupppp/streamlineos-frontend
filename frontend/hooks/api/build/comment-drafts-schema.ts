import {
  commentDraftsUpsertResponseSchema,
  commentDraftsListMineResponseSchema,
  commentDraftsDeleteOneResponseSchema,
  commentDraftsGenerateDraftResponseSchema,
  type CommentDraftsGenerateDraftResponse,
} from "@/contracts/build-contracts.generated";

export const commentDraftContract = commentDraftsUpsertResponseSchema;

export const commentDraftListItemContract = commentDraftsListMineResponseSchema.element;

export const commentDraftListContract = commentDraftsListMineResponseSchema;

export const commentDraftDeletedContract = commentDraftsDeleteOneResponseSchema;

export const generatedCommentDraftSchema = commentDraftsGenerateDraftResponseSchema;

export type GeneratedCommentDraft = CommentDraftsGenerateDraftResponse;
