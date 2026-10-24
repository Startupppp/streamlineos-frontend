import { signBulkJobCreateContract } from "./sign-schema";

const JOB = {
  id: 7,
  orgId: "org-1",
  templateId: 4,
  senderMembershipId: 1,
  status: "pending",
  columnMappingJson: { name: "name", email: "email" },
  totalCount: 3,
  successCount: 0,
  failedCount: 0,
  csvFileKey: null,
  errorReportFileKey: null,
  createdAt: "2026-10-24T00:00:00.000Z",
  completedAt: null,
};

describe("the bulk send create response contract", () => {
  it("accepts a dry run that saved no job and only reports row counts", () => {
    const parsed = signBulkJobCreateContract.parse({ dryRun: true, preview: [], totalCount: 3, validCount: 2, failedCount: 1 });

    expect(parsed).toMatchObject({ dryRun: true, validCount: 2, totalCount: 3 });
  });

  it("still accepts a queued job", () => {
    const parsed = signBulkJobCreateContract.parse({ job: JOB, dryRun: false, queued: true });

    expect(parsed).toMatchObject({ job: { id: 7 }, queued: true });
  });

  it("rejects a dry run that is missing its counts", () => {
    expect(signBulkJobCreateContract.safeParse({ dryRun: true, preview: [] }).success).toBe(false);
  });
});
