import { readFileSync } from "node:fs";
import { backendPath, backendReachable } from "@/lib/test-support/backend-path";
import {
  goalRowContract,
  goalListItemContract,
  goalsListContract,
  goalStatsContract,
  goalDetailContract,
} from "./goals-schema";

const GOALS_SERVICE = "src/modules/goals/goals.service.ts";
const GOALS_RESPONSE_SCHEMAS = "src/modules/goals/dto/goals-response.schemas.ts";

function firstRowKeys<T extends object>(rows: T[]): string[] {
  const row = rows[0];
  if (row === undefined) throw new Error("Expected a parsed contract row");
  return Object.keys(row);
}

const GOAL_ROW = {
  id: 1,
  orgId: "org-1",
  title: "Increase ARR",
  description: null,
  ownerMembershipId: 5,
  level: "company",
  status: "on_track",
  progress: 42,
  startDate: "2026-01-01",
  dueDate: "2026-12-31",
  parentGoalId: null,
  projectId: null,
  createdByMembershipId: 5,
  createdAt: "2026-09-19T10:00:00.000Z",
  updatedAt: "2026-09-19T10:00:00.000Z",
  deletedAt: null,
};

const GOAL_OWNER = {
  id: "user-1",
  name: "Alice",
  email: "alice@example.com",
  image: null,
};

const GOAL_LIST_ITEM = {
  ...GOAL_ROW,
  owner: GOAL_OWNER,
  keyResultCount: 3,
};

const GOALS_LIST_PAGE = {
  items: [GOAL_LIST_ITEM],
  page: 1,
  pageSize: 25,
  total: 1,
};

describe("goals list contract matches the backend goals response schema", () => {
  it("reaches the backend goals service and response schema, so a broken scan fails instead of passing vacuously", () => {
    expect(backendReachable(GOALS_SERVICE)).toBe(true);
    expect(backendReachable(GOALS_RESPONSE_SCHEMAS)).toBe(true);
  });

  it("backend uses buildListResponse which emits items/page/pageSize/total — contract keeps these four keys", () => {
    const parsed = goalsListContract.parse(GOALS_LIST_PAGE);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(25);
    expect(parsed.total).toBe(1);
  });

  it("strips the totalPages backend adds, since z.object strips unknown keys — this is not drift, it is intentional", () => {
    const parsed = goalsListContract.parse({ ...GOALS_LIST_PAGE, totalPages: 1 });
    expect((parsed as Record<string, unknown>)["totalPages"]).toBeUndefined();
  });

  it("rejects a level the backend enum never emits, where z.string() would pass it through silently", () => {
    expect(() =>
      goalListItemContract.parse({ ...GOAL_LIST_ITEM, level: "department" }),
    ).toThrow();
  });

  it("rejects a status the backend enum never emits", () => {
    expect(() =>
      goalListItemContract.parse({ ...GOAL_LIST_ITEM, status: "ACTIVE" }),
    ).toThrow();
  });

  it("accepts every valid goal status the backend can emit", () => {
    const validStatuses = [
      "not_started",
      "on_track",
      "at_risk",
      "off_track",
      "completed",
    ];
    for (const status of validStatuses) {
      expect(() =>
        goalListItemContract.parse({ ...GOAL_LIST_ITEM, status }),
      ).not.toThrow();
    }
  });

  it("accepts every valid goal level the backend can emit", () => {
    const validLevels = ["company", "team", "individual"];
    for (const level of validLevels) {
      expect(() =>
        goalListItemContract.parse({ ...GOAL_LIST_ITEM, level }),
      ).not.toThrow();
    }
  });

  it("keeps ownerMembershipId on the row since it is used to resolve the owner display", () => {
    const parsed = goalRowContract.parse(GOAL_ROW);
    expect(parsed.ownerMembershipId).toBe(5);
  });

  it("keeps deletedAt on the row so a soft-deleted goal is distinguishable from an absent one", () => {
    const parsed = goalRowContract.parse({ ...GOAL_ROW, deletedAt: "2026-09-01T00:00:00.000Z" });
    expect(parsed.deletedAt).toBe("2026-09-01T00:00:00.000Z");
  });

  it("accepts a null owner when no owner is assigned", () => {
    const parsed = goalListItemContract.parse({ ...GOAL_LIST_ITEM, owner: null });
    expect(parsed.owner).toBeNull();
  });

  it("keeps keyResultCount so the list row does not need a secondary fetch per goal", () => {
    const parsed = goalListItemContract.parse(GOAL_LIST_ITEM);
    expect(parsed.keyResultCount).toBe(3);
  });
});

describe("goal stats contract matches backend GoalStats shape", () => {
  it("parses the stats aggregate the backend getStats method returns", () => {
    const parsed = goalStatsContract.parse({
      total: 10,
      byStatus: { not_started: 2, on_track: 5, at_risk: 1, off_track: 1, completed: 1 },
      avgProgress: 62.5,
      atRisk: 1,
      completed: 1,
    });
    expect(parsed.total).toBe(10);
    expect(parsed.avgProgress).toBe(62.5);
  });

  it("rejects a stats payload missing atRisk, because atRisk drives the status strip", () => {
    expect(() =>
      goalStatsContract.parse({ total: 10, byStatus: {}, avgProgress: 0, completed: 0 }),
    ).toThrow();
  });
});

describe("goal backend response schema consistency check", () => {
  it("confirms the backend response schema file uses the same field names as the frontend contract", () => {
    const source = readFileSync(backendPath(GOALS_RESPONSE_SCHEMAS), "utf8");
    const frontendKeys = firstRowKeys([GOAL_ROW]);
    for (const key of frontendKeys) {
      if (key === "deletedAt") {
        expect(source).toContain("deletedAt");
      } else {
        expect(source).toContain(key);
      }
    }
  });
});
