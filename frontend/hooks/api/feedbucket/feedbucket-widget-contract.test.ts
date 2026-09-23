import { feedbucketWidgetListContract } from "./feedbucket-schema";

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
