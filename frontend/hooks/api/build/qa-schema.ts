import {
  testSuitesListSuitesResponseSchema,
  testCasesCreateCaseResponseSchema,
  testCasesListCasesResponseSchema,
  testRunsListRunsResponseSchema,
  testRunsCreateRunResponseSchema,
  testRunsGetRunResponseSchema,
  testRunsUpdateResultResponseSchema,
  bugsListBugsResponseSchema,
} from "@/contracts/build-contracts.generated";

export const testSuiteListContract = testSuitesListSuitesResponseSchema;

export const testCaseRowContract = testCasesCreateCaseResponseSchema;

export const testCasePageContract = testCasesListCasesResponseSchema;

export const testRunListItemContract = testRunsListRunsResponseSchema.shape.data.element;

export const testRunListPageContract = testRunsListRunsResponseSchema;

export const testRunRowContract = testRunsCreateRunResponseSchema;

export const testRunDetailContract = testRunsGetRunResponseSchema;

export const testRunResultRowContract = testRunsUpdateResultResponseSchema;

export const bugRowContract = bugsListBugsResponseSchema.element;

export const bugListContract = bugsListBugsResponseSchema;
