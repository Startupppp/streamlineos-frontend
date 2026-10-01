import {
  scopeDirectorySearchResponseSchema,
  scopeDirectoryResolveResponseSchema,
} from "@/contracts/build-contracts.generated";

export const scopeDirectoryRefSchema = scopeDirectorySearchResponseSchema.shape.data.element;

export const scopeDirectoryResolveContract = scopeDirectoryResolveResponseSchema;

export const scopeDirectorySearchContract = scopeDirectorySearchResponseSchema;
