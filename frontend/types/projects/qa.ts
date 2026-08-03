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

export interface TestCase {
  id: number;
  projectId: number;
  suiteId: number | null;
  caseNumber: number;
  title: string;
  preconditions: string | null;
  steps: TestStep[];
  expectedResult: string | null;
  priority: TestCasePriority;
  component: string | null;
  linkedTicketId: number | null;
  automationStatus: TestCaseAutomationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TestRunCounts {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  notRun: number;
}

export interface TestRun {
  id: number;
  projectId: number;
  runNumber: number;
  name: string;
  sprintId: number | null;
  releaseId: number | null;
  environment: string | null;
  browserDevice: string | null;
  testerId: string | null;
  status: TestRunStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  counts?: TestRunCounts;
}

export interface TestRunResult {
  id: number;
  runId: number;
  testCaseId: number;
  status: TestResultStatus;
  notes: string | null;
  executedBy: string | null;
  executedAt: string | null;
  linkedBugId: number | null;
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
  sprintId?: number;
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
