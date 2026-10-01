import { unifiedInboxContract } from "./inbox-schema";

function makeBuildApprovalPage(extra: Record<string, unknown> = {}) {
  return {
    items: [
      {
        kind: "build_approval",
        id: 7,
        status: "pending",
        approvalKind: "manual",
        projectId: 1,
        ticketId: 42,
        dueAt: null,
        sourceModule: "build",
        actor: null,
        subject: "Review required",
        timestamp: "2026-09-01T00:00:00Z",
        isRead: false,
        deepLink: null,
        dedupKey: "approval:7",
        ...extra,
      },
    ],
    hasMore: false,
    nextCursor: null,
    sources: [],
    degraded: false,
  };
}

describe("unifiedInboxContract — build_approval item shape", () => {
  it("preserves objectType and objectId sent by the backend", () => {
    const raw = makeBuildApprovalPage({
      objectType: "ticket",
      objectId: "tkt-0042",
    });

    const parsed = unifiedInboxContract.parse(raw);
    const item = parsed.items[0];

    if (item.kind !== "build_approval") throw new Error("unexpected kind");

    expect(item.objectType).toBe("ticket");
    expect(item.objectId).toBe("tkt-0042");
  });

  it("preserves a blocker objectType so the detail panel can show the referenced object", () => {
    const raw = makeBuildApprovalPage({
      objectType: "blocker",
      objectId: "blk-99",
    });

    const parsed = unifiedInboxContract.parse(raw);
    const item = parsed.items[0];

    if (item.kind !== "build_approval") throw new Error("unexpected kind");

    expect(item.objectType).toBe("blocker");
    expect(item.objectId).toBe("blk-99");
  });
});
