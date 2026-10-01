import { z } from "zod";
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

export const testSuiteRowContract = testSuitesListSuitesResponseSchema.element;

export const testSuiteListContract = testSuitesListSuitesResponseSchema;

export const testCaseRowContract = testCasesCreateCaseResponseSchema.extend({
  steps: z.array(z.object({ action: z.string(), expected: z.string() })).nullable(),
});

export const testCasePageContract = testCasesListCasesResponseSchema.extend({
  data: testCaseRowContract.array(),
});

export const testRunListItemContract = testRunsListRunsResponseSchema.shape.data.element;

export const testRunListPageContract = testRunsListRunsResponseSchema;

export const testRunRowContract = testRunsCreateRunResponseSchema;

export const testRunDetailResultContract = testRunsGetRunResponseSchema.shape.results.element;

export const testRunDetailContract = testRunsGetRunResponseSchema;

export const testRunResultRowContract = testRunsUpdateResultResponseSchema;

export const bugRowContract = bugsListBugsResponseSchema.element;

export const bugListContract = bugsListBugsResponseSchema;
