import { z } from "zod";

export const testSuiteRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  parentId: z.number().int().nullable(),
  position: z.number().int(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const testSuiteListContract = z.array(testSuiteRowContract);

export const testCaseRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  suiteId: z.number().int().nullable(),
  caseNumber: z.number().int(),
  title: z.string(),
  preconditions: z.string().nullable(),
  steps: z.array(z.object({ action: z.string(), expected: z.string() })).nullable(),
  expectedResult: z.string().nullable(),
  priority: z.string(),
  component: z.string().nullable(),
  linkedTicketId: z.number().int().nullable(),
  automationStatus: z.string(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const testCaseListContract = z.array(testCaseRowContract);

const testRunRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  runNumber: z.number().int(),
  name: z.string(),
  sprintId: z.number().int().nullable(),
  releaseId: z.number().int().nullable(),
  environment: z.string().nullable(),
  browserDevice: z.string().nullable(),
  testerId: z.string().nullable(),
  testerMembershipId: z.number().int().nullable(),
  status: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  counts: z.object({
    total: z.number().int(),
    passed: z.number().int(),
    failed: z.number().int(),
    blocked: z.number().int(),
    skipped: z.number().int(),
    notRun: z.number().int(),
  }).optional(),
});

const testRunListItemContract = testRunRowContract.extend({
  passCount: z.number().int(),
  failCount: z.number().int(),
  blockedCount: z.number().int(),
  notRunCount: z.number().int(),
  skippedCount: z.number().int(),
});

export const testRunListContract = z.array(testRunListItemContract);
export { testRunRowContract };

export const testRunResultRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  runId: z.number().int(),
  testCaseId: z.number().int(),
  status: z.enum(["not_run", "passed", "failed", "blocked", "skipped"]),
  notes: z.string().nullable(),
  executedBy: z.string().nullable(),
  executedAt: z.string().nullable(),
  linkedBugId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const testRunDetailContract = testRunRowContract.extend({
  results: z.array(testRunResultRowContract),
});

export const bugRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  bugNumber: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  severity: z.string(),
  priority: z.string(),
  status: z.string(),
  stepsToReproduce: z.string().nullable(),
  expectedResult: z.string().nullable(),
  actualResult: z.string().nullable(),
  environment: z.string().nullable(),
  browserDevice: z.string().nullable(),
  affectedReleaseId: z.number().int().nullable(),
  fixedReleaseId: z.number().int().nullable(),
  assigneeMembershipId: z.number().int().nullable(),
  reporterId: z.string().nullable(),
  qaOwnerId: z.string().nullable(),
  qaOwnerMembershipId: z.number().int().nullable(),
  reopenCount: z.number().int(),
  linkedTicketId: z.number().int().nullable(),
  linkedTestCaseId: z.number().int().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const bugListContract = z.array(bugRowContract);

export const qaSuccessContract = z.object({ success: z.literal(true) });
