import {
  commentDraftsListMineResponseSchema,
  commentDraftsUpsertResponseSchema,
  commentDraftsDeleteByTicketResponseSchema,
} from "@/contracts/build-contracts.generated";

export const commentDraftListItemContract = commentDraftsListMineResponseSchema.shape.data.element;
export const commentDraftContract = commentDraftsUpsertResponseSchema;
export const commentDraftDeletedContract = commentDraftsDeleteByTicketResponseSchema;
