import { z } from "zod";
import { idCursorPageContract } from "@/hooks/api/cursor-page-schema";

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
  priority: z.enum(["low", "medium", "high"]),
  component: z.string().nullable(),
  linkedTicketId: z.number().int().nullable(),
  automationStatus: z.enum(["manual", "automated", "planned"]),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const testCasePageContract = idCursorPageContract(testCaseRowContract);

const testRunRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  runNumber: z.number().int(),
  name: z.string(),
  cycleId: z.number().int().nullable(),
  releaseId: z.number().int().nullable(),
  environment: z.string().nullable(),
  browserDevice: z.string().nullable(),
  testerId: z.string().nullable(),
  testerMembershipId: z.number().int().nullable(),
  status: z.enum(["not_started", "in_progress", "completed", "aborted"]),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const testRunListItemContract = testRunRowContract.extend({
  passCount: z.number().int(),
  failCount: z.number().int(),
  blockedCount: z.number().int(),
  notRunCount: z.number().int(),
  skippedCount: z.number().int(),
});

export const testRunListPageContract = idCursorPageContract(testRunListItemContract);
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
  linkedWorkItemId: z.number().int().nullable(),
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
  ticketNumber: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.literal("BUG"),
  status: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeMembershipId: z.number().int().nullable(),
  reporterId: z.string().nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  qaState: z.enum(["new", "triaged", "assigned", "in_progress", "fixed", "ready_for_qa", "verified", "reopened", "closed"]).nullable(),
  severity: z.enum(["blocker", "critical", "major", "minor", "trivial"]).nullable(),
  stepsToReproduce: z.string().nullable(),
  expectedResult: z.string().nullable(),
  actualResult: z.string().nullable(),
  environment: z.string().nullable(),
  browserDevice: z.string().nullable(),
  affectedReleaseId: z.number().int().nullable(),
  fixedReleaseId: z.number().int().nullable(),
  qaOwnerUserId: z.string().nullable(),
  qaOwnerMembershipId: z.number().int().nullable(),
  linkedTestCaseId: z.number().int().nullable(),
  reopenCount: z.number().int().nullable(),
  createdByUserId: z.string().nullable(),
});

export const bugListContract = z.array(bugRowContract);

export const qaSuccessContract = z.object({ success: z.literal(true) });
