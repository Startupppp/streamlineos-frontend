import {
  commentDraftsUpsertResponseSchema,
  commentDraftsReadByTicketResponseSchema,
  commentDraftsListMineResponseSchema,
  commentDraftsDeleteOneResponseSchema,
  commentDraftsGenerateDraftResponseSchema,
  type CommentDraftsGenerateDraftResponse,
  type CommentDraftsReadByTicketResponse,
} from "@/contracts/build-contracts.generated";

export const commentDraftContract = commentDraftsUpsertResponseSchema;
export const commentDraftByTicketContract = commentDraftsReadByTicketResponseSchema;
export type TicketCommentDraft = CommentDraftsReadByTicketResponse;

export const commentDraftListItemContract = commentDraftsListMineResponseSchema.shape.data.element;

export const commentDraftListContract = commentDraftsListMineResponseSchema;

export const commentDraftDeletedContract = commentDraftsDeleteOneResponseSchema;

export const generatedCommentDraftSchema = commentDraftsGenerateDraftResponseSchema;

export type GeneratedCommentDraft = CommentDraftsGenerateDraftResponse;
