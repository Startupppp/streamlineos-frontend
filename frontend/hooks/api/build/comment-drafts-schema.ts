import {
  commentDraftsListMineResponseSchema,
  commentDraftsUpsertResponseSchema,
  commentDraftsDeleteByTicketResponseSchema,
  commentDraftsGenerateDraftResponseSchema,
} from "@/contracts/build-contracts.generated";

export const commentDraftListItemContract = commentDraftsListMineResponseSchema.shape.data.element;
export const commentDraftContract = commentDraftsUpsertResponseSchema;
export const commentDraftDeletedContract = commentDraftsDeleteByTicketResponseSchema;
export const commentDraftListContract = commentDraftsListMineResponseSchema;
export const generatedCommentDraftSchema = commentDraftsGenerateDraftResponseSchema;
