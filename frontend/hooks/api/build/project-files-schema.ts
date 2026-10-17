import {
  filesUploadFileResponseSchema,
  filesListFilesResponseSchema,
  filesGetSignedUrlResponseSchema,
} from "@/contracts/build-contracts.generated";

export const fileRowContract = filesUploadFileResponseSchema;


export const filePageContract = filesListFilesResponseSchema;

export const signedUrlContract = filesGetSignedUrlResponseSchema;
