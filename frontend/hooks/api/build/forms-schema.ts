import {
  formsGetFormResponseSchema,
  formsListFormsResponseSchema,
  submissionsListSubmissionsResponseSchema,
  submissionsCreateSubmissionResponseSchema,
} from "@/contracts/build-contracts.generated";

export const formRowContract = formsGetFormResponseSchema;

export const formResponseContract = formsListFormsResponseSchema;

export const submissionResponseContract = submissionsListSubmissionsResponseSchema;

export const submissionCreateResultContract = submissionsCreateSubmissionResponseSchema;
