import { ZodError } from "zod";
import {
  approvalInboxItemContract,
  approvalInboxPageContract,
  approvalStatusSchema,
  approvalEntityTypeSchema,
} from "./approvals-schema";

const KNOWN_GOOD_INBOX_ITEM = {
  id: 1,
  projectId: 42,
  projectName: "Deploy Platform",
  projectKey: "DP",
  entityType: "task" as const,
  entityId: 10,
  title: "Approve deploy to production",
  status: "pending" as const,
  level: 1,
  dueAt: "2026-10-01T00:00:00.000Z",
  requestedById: "user-abc",
  decidedAt: null,
};

describe("approvalStatusSchema — enum values match the backend approvalStatusEnum", () => {
  it("accepts every status value the backend can emit", () => {
    const values = [
      "requested",
      "pending",
      "approved",
      "rejected",
      "changes_requested",
      "escalated",
      "cancelled",
    ] as const;
    for (const v of values) {
      expect(() => approvalStatusSchema.parse(v)).not.toThrow();
    }
  });

  it("rejects a status value the backend never emits so z.string() drift cannot hide a bad wire value", () => {
    expect(() => approvalStatusSchema.parse("unknown_status")).toThrow(ZodError);
  });

  it("rejects an empty string status", () => {
    expect(() => approvalStatusSchema.parse("")).toThrow(ZodError);
  });
});

describe("approvalEntityTypeSchema — enum values match the backend approvalEntityTypeEnum", () => {
  it("accepts every entity-type the backend can emit", () => {
    const values = [
      "task",
      "milestone",
      "budget",
      "release",
      "change_request",
      "document",
      "timesheet",
      "client_approval",
    ] as const;
    for (const v of values) {
      expect(() => approvalEntityTypeSchema.parse(v)).not.toThrow();
    }
  });

  it("rejects an entity type the backend never emits", () => {
    expect(() => approvalEntityTypeSchema.parse("invoice")).toThrow(ZodError);
  });
});

describe("approvalInboxItemContract — shape matches the backend approvalInboxItemSchema", () => {
  it("parses a complete inbox item the backend actually returns", () => {
    const result = approvalInboxItemContract.parse(KNOWN_GOOD_INBOX_ITEM);
    expect(result.id).toBe(1);
    expect(result.status).toBe("pending");
    expect(result.entityType).toBe("task");
  });

  it("parses an item whose projectId, dueAt, requestedById, and decidedAt are all null", () => {
    const result = approvalInboxItemContract.parse({
      ...KNOWN_GOOD_INBOX_ITEM,
      projectId: null,
      projectName: null,
      projectKey: null,
      dueAt: null,
      requestedById: null,
      decidedAt: null,
    });
    expect(result.projectId).toBeNull();
    expect(result.dueAt).toBeNull();
  });

  it("rejects an item whose status is not in the backend enum so a drift from z.string() is caught at parse time", () => {
    expect(() =>
      approvalInboxItemContract.parse({
        ...KNOWN_GOOD_INBOX_ITEM,
        status: "open",
      }),
    ).toThrow(ZodError);
  });

  it("rejects an item whose entityType is not in the backend enum", () => {
    expect(() =>
      approvalInboxItemContract.parse({
        ...KNOWN_GOOD_INBOX_ITEM,
        entityType: "invoice",
      }),
    ).toThrow(ZodError);
  });
});

describe("approvalInboxPageContract — pagination envelope shape", () => {
  it("parses a page with one item and a nextCursor", () => {
    const result = approvalInboxPageContract.parse({
      data: [KNOWN_GOOD_INBOX_ITEM],
      pagination: { limit: 25, hasMore: true, nextCursor: "cursor-abc" },
    });
    expect(result.data).toHaveLength(1);
    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.nextCursor).toBe("cursor-abc");
  });

  it("parses a terminal page with hasMore false and nextCursor null", () => {
    const result = approvalInboxPageContract.parse({
      data: [KNOWN_GOOD_INBOX_ITEM],
      pagination: { limit: 25, hasMore: false, nextCursor: null },
    });
    expect(result.pagination.hasMore).toBe(false);
    expect(result.pagination.nextCursor).toBeNull();
  });
});
