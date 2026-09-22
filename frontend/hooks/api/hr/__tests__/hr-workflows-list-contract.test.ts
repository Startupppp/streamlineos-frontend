import { workflowDefinitionListContract } from "@/hooks/api/hr/hr-workflows-schema";

const LIVE_LIST_RESPONSE = {
  data: [
    {
      id: 7,
      orgId: "org-1",
      objectType: "leave_request",
      name: "Leave approval",
      status: "active",
      version: 1,
      isDefault: true,
      settings: { rejectionCommentRequired: true },
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      deletedAt: null,
      stepCount: 2,
    },
  ],
  pagination: { limit: 50, hasMore: false, nextCursor: null },
};

describe("GET /hr/workflows contract follows the backend's cursor page", () => {
  it("parses the shape HrWorkflowDefinitionsService.list returns", () => {
    const parsed = workflowDefinitionListContract.parse(LIVE_LIST_RESPONSE);

    expect(parsed.data[0]?.settings).toEqual({ rejectionCommentRequired: true });
    expect(parsed.data[0]?.stepCount).toBe(2);
    expect(parsed.pagination.nextCursor).toBeNull();
  });

  it("rejects the offset page the contract used to demand, so drift fails loudly", () => {
    const offsetShaped = { data: LIVE_LIST_RESPONSE.data, page: 1, limit: 50 };

    expect(workflowDefinitionListContract.safeParse(offsetShaped).success).toBe(false);
  });

  it("rejects a row without settings", () => {
    const { settings: _settings, ...withoutSettings } = LIVE_LIST_RESPONSE.data[0];
    const response = { ...LIVE_LIST_RESPONSE, data: [withoutSettings] };

    expect(workflowDefinitionListContract.safeParse(response).success).toBe(false);
  });
});
