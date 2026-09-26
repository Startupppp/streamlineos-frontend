import { readFileSync } from "node:fs";
import { backendPath, backendReachable } from "@/lib/test-support/backend-path";
import { milestoneListContract } from "./workspace-schema";

const WORKSPACE_SERVICE = "src/modules/build/execution/workspace.service.ts";
const MEMBERS_SCHEMA = "src/db/schema/build/members.ts";

const MILESTONE_ROW = {
  id: 1,
  projectId: 10,
  orgId: "org-1",
  name: "Beta Launch",
  description: null,
  targetDate: "2026-12-15",
  status: "PENDING",
  createdBy: "user-1",
  clientVisible: false,
  deletedAt: null,
  createdAt: "2026-09-19T10:00:00.000Z",
  updatedAt: "2026-09-19T10:00:00.000Z",
};

const CURSOR_PAGE = {
  data: [MILESTONE_ROW],
  pagination: { limit: 20, hasMore: false, nextCursor: null },
};

describe("milestones list contract matches the workspace service projection", () => {
  it("reaches the backend workspace service and members schema, so a broken scan fails instead of passing vacuously", () => {
    expect(backendReachable(WORKSPACE_SERVICE)).toBe(true);
    expect(backendReachable(MEMBERS_SCHEMA)).toBe(true);
  });

  it("parses a cursor page envelope with one milestone row", () => {
    const parsed = milestoneListContract.parse(CURSOR_PAGE);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0]?.id).toBe(1);
    expect(parsed.pagination.hasMore).toBe(false);
    expect(parsed.pagination.nextCursor).toBeNull();
  });

  it("rejects a status outside the three DB check-constraint values, where z.string() would let an invalid status through", () => {
    expect(() =>
      milestoneListContract.parse({ ...CURSOR_PAGE, data: [{ ...MILESTONE_ROW, status: "DONE" }] }),
    ).toThrow();
    expect(() =>
      milestoneListContract.parse({ ...CURSOR_PAGE, data: [{ ...MILESTONE_ROW, status: "PENDING_APPROVAL" }] }),
    ).toThrow();
  });

  it("accepts every valid milestone status the DB check constraint allows", () => {
    const validStatuses = ["PENDING", "ACHIEVED", "MISSED"];
    for (const status of validStatuses) {
      expect(() =>
        milestoneListContract.parse({ ...CURSOR_PAGE, data: [{ ...MILESTONE_ROW, status }] }),
      ).not.toThrow();
    }
  });

  it("keeps clientVisible so milestone visibility can be gated on the client portal flag", () => {
    const parsed = milestoneListContract.parse(CURSOR_PAGE);
    expect(parsed.data[0]?.clientVisible).toBe(false);
  });

  it("keeps deletedAt so a soft-deleted milestone is distinguishable from an absent one", () => {
    const parsed = milestoneListContract.parse({
      ...CURSOR_PAGE,
      data: [{ ...MILESTONE_ROW, deletedAt: "2026-09-01T00:00:00.000Z" }],
    });
    expect(parsed.data[0]?.deletedAt).toBe("2026-09-01T00:00:00.000Z");
  });

  it("confirms the backend members schema file defines clientVisible on project_milestones", () => {
    const source = readFileSync(backendPath(MEMBERS_SCHEMA), "utf8");
    expect(source).toContain("clientVisible");
    expect(source).toContain("project_milestones");
  });

  it("confirms the backend workspace service has a limit on listMilestones to keep reads bounded", () => {
    const source = readFileSync(backendPath(WORKSPACE_SERVICE), "utf8");
    expect(source).toMatch(/limit\s*\+\s*1/);
  });
});
