import {
  updatesCreateUpdateResponseSchema,
  updatesListUpdatesResponseSchema,
} from "@/contracts/build-contracts.generated";

export const updateRowContract = updatesCreateUpdateResponseSchema;

export const cursorPaginationContract = updatesListUpdatesResponseSchema.shape.pagination;

export const updatePageContract = updatesListUpdatesResponseSchema;
