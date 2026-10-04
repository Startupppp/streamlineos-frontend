import { commentDraftsListMineResponseSchema } from "@/contracts/build-contracts.generated";

export const commentDraftListItemContract = commentDraftsListMineResponseSchema.shape.data.element;
