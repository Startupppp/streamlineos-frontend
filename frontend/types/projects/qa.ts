import type { z } from "zod";
import type { testRunRowContract, testRunListItemContract } from "@/hooks/api/build/qa-schema";
import type { testCaseRowContract } from "@/hooks/api/build/qa-schema";
export type TestCasePriority = "low" | "medium" | "high";
export type TestCaseAutomationStatus = "manual" | "automated" | "planned";
export type TestRunStatus = "not_started" | "in_progress" | "completed" | "aborted";
export type TestResultStatus = "not_run" | "passed" | "failed" | "blocked" | "skipped";

export interface TestStep {
  action: string;
  expected: string;
}

export interface TestSuite {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  parentId: number | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export type TestCase = z.infer<typeof testCaseRowContract>;



export interface TestRunCounts {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  notRun: number;
}

export type TestRun = z.infer<typeof testRunRowContract>;
export type TestRunListItem = z.infer<typeof testRunListItemContract>;



export interface TestRunResult {
  id: number;
  runId: number;
  testCaseId: number;
  status: TestResultStatus;
  notes: string | null;
  executedBy: string | null;
  executedAt: string | null;
  linkedWorkItemId: number | null;
  testCase?: {
    caseNumber: number;
    title: string;
    priority: TestCasePriority;
  };
}

export interface TestRunDetail extends TestRun {
  results: TestRunResult[];
}

export interface CreateTestCaseInput {
  suiteId?: number;
  title: string;
  preconditions?: string;
  steps?: TestStep[];
  expectedResult?: string;
  priority?: TestCasePriority;
  component?: string;
  linkedTicketId?: number;
  automationStatus?: TestCaseAutomationStatus;
}

export type UpdateTestCaseInput = Partial<CreateTestCaseInput>;

export interface CreateTestRunInput {
  name: string;
  caseIds?: number[];
  suiteId?: number;
  environment?: string;
  browserDevice?: string;
  testerId?: string;
  cycleId?: number;
  releaseId?: number;
}

export interface UpdateTestRunInput {
  name?: string;
  status?: TestRunStatus;
  environment?: string;
  browserDevice?: string;
  testerId?: string;
}

export interface UpdateTestResultInput {
  status: TestResultStatus;
  notes?: string;
}
