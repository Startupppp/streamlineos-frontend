import {
  feedbucketClassifySubmissionContract,
  feedbucketMarkDuplicateContract,
  feedbucketSubmissionDetailContract,
  feedbucketUnmarkDuplicateContract,
  feedbucketWidgetListContract,
} from "./feedbucket-schema";

const deployedWidgetRow = {
  id: 1,
  orgId: "871a5fd2-df81-4e79-a097-9910d6640a01",
  projectId: 1,
  managedProductId: null,
  name: "Website feedback",
  publicKey: "fb_live_abc123",
  allowedDomains: [],
  autoCreateTicket: false,
  defaultTicketType: "BUG",
  isActive: true,
  aiAssistEnabled: false,
  theme: null,
  createdBy: null,
  createdAt: "2026-09-17T00:00:00Z",
  updatedAt: "2026-09-17T00:00:00Z",
  deletedAt: null,
  project: null,
  submissionCount: 0,
  openCount: 0,
};

describe("the feedbucket widgets list a frontend shipped ahead of the API has to survive", () => {
  it("accepts a widget row without the three routing fields, so /build/:projectId/feedbucket still renders", () => {
    const result = feedbucketWidgetListContract.safeParse([deployedWidgetRow]);

    expect(result.success).toBe(true);
  });

  it("still accepts the row once the API sends them, so the fix does not strand the newer backend", () => {
    const result = feedbucketWidgetListContract.safeParse([
      {
        ...deployedWidgetRow,
        defaultProjectId: 7,
        defaultAssigneeMembershipId: null,
        assigneeRules: { bug: 12, idea: 15 },
      },
    ]);

    expect(result.success).toBe(true);
  });

  it("accepts the explicit nulls the column defaults produce", () => {
    const result = feedbucketWidgetListContract.safeParse([
      {
        ...deployedWidgetRow,
        defaultProjectId: null,
        defaultAssigneeMembershipId: null,
        assigneeRules: null,
      },
    ]);

    expect(result.success).toBe(true);
  });

  it("rejects a wrongly typed routing field, so tolerance for absence is not tolerance for garbage", () => {
    const result = feedbucketWidgetListContract.safeParse([
      { ...deployedWidgetRow, defaultProjectId: "seven" },
    ]);

    expect(result.success).toBe(false);
  });
});

const deployedSubmissionDetail = {
  id: 95,
  orgId: "871a5fd2-df81-4e79-a097-9910d6640a01",
  widgetId: 34,
  type: "feature",
  status: "open",
  priority: null,
  message: "Export to CSV from the roadmap board",
  pageUrl: null,
  screenshotUrl: null,
  screenshotKey: null,
  metadata: null,
  consoleLogs: null,
  networkLogs: null,
  reporterName: null,
  reporterEmail: null,
  crmContactId: null,
  crmOrganizationId: null,
  accountValueSnapshot: null,
  assigneeMembershipId: null,
  linkedTicketId: null,
  linkedTicketKey: null,
  aiType: null,
  aiConfidence: null,
  aiAnalysis: null,
  aiModel: null,
  aiProcessedAt: null,
  createdAt: "2026-10-11T09:46:37.587Z",
  updatedAt: "2026-10-11T09:46:37.587Z",
  deletedAt: null,
  sourceChannel: "manual",
  segment: "QA",
  theme: "Export",
  sentiment: null,
  consentStatus: "unknown",
  consentRecordedAt: null,
  duplicateOfId: null,
  duplicateCount: 0,
  opportunityIds: [],
  customer: null,
  widget: null,
  linkedTicket: null,
  recordingUrl: null,
};

describe("the feedbucket submission detail the product feedback pane reads", () => {
  it("accepts the Postgres count the deployed API sends as a numeric string", () => {
    const result = feedbucketSubmissionDetailContract.safeParse({
      ...deployedSubmissionDetail,
      duplicateCount: "2",
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.duplicateCount).toBe(2);
  });

  it("accepts the numeric count the fixed API sends", () => {
    expect(feedbucketSubmissionDetailContract.safeParse(deployedSubmissionDetail).success).toBe(true);
  });

  it("rejects a count that is not a whole non-negative number", () => {
    expect(
      feedbucketSubmissionDetailContract.safeParse({ ...deployedSubmissionDetail, duplicateCount: "many" }).success,
    ).toBe(false);
    expect(
      feedbucketSubmissionDetailContract.safeParse({ ...deployedSubmissionDetail, duplicateCount: -1 }).success,
    ).toBe(false);
  });
});
describe("the feedbucket triage writes, validated after the API client strips the envelope", () => {
  const classification = {
    id: 95,
    theme: "Data export",
    segment: "QA",
    sentiment: "positive",
    consentStatus: "unknown",
    consentRecordedAt: null,
    updatedAt: "2026-10-11T10:04:26.040Z",
  };

  it("accepts the unwrapped classification the API returns", () => {
    expect(feedbucketClassifySubmissionContract.safeParse(classification).success).toBe(true);
  });

  it("rejects a still-enveloped classification so a double envelope cannot slip through", () => {
    expect(
      feedbucketClassifySubmissionContract.safeParse({ success: true, data: classification }).success,
    ).toBe(false);
  });

  it("accepts the unwrapped duplicate mark and unmark results", () => {
    expect(feedbucketMarkDuplicateContract.safeParse({ id: 96, duplicateOfId: 95 }).success).toBe(true);
    expect(feedbucketUnmarkDuplicateContract.safeParse({ id: 96 }).success).toBe(true);
  });

  it("rejects a duplicate mark without the canonical submission", () => {
    expect(feedbucketMarkDuplicateContract.safeParse({ id: 96 }).success).toBe(false);
  });
});