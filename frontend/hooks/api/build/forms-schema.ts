import {
  formsGetFormResponseSchema,
  formsListFormsResponseSchema,
  submissionsListSubmissionsResponseSchema,
  submissionsCreateSubmissionResponseSchema,
  submissionsUpdateSubmissionResponseSchema,
} from "@/contracts/build-contracts.generated";

export const formRowContract = formsGetFormResponseSchema;

export const formResponseContract = formsListFormsResponseSchema;

export const submissionRowContract = submissionsUpdateSubmissionResponseSchema;

export const submissionResponseContract = submissionsListSubmissionsResponseSchema;

export const submissionCreateResultContract = submissionsCreateSubmissionResponseSchema;
