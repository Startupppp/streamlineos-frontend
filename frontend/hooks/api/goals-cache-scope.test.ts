import { readFileSync } from "node:fs";
import path from "node:path";

const SOURCE = readFileSync(path.join(__dirname, "goals.ts"), "utf8");

function bodyOf(hookName: string): string {
  const start = SOURCE.indexOf(`export function ${hookName}(`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = SOURCE.indexOf("\nexport function ", start + 1);
  return SOURCE.slice(start, next === -1 ? undefined : next);
}

const GOAL_WRITES = [
  "useCreateGoal",
  "useUpdateGoal",
  "useDeleteGoal",
];

const CHECK_IN_WRITES = ["useCheckIn"];

describe("goals cache invalidation is scoped correctly", () => {
  it.each(GOAL_WRITES)(
    "%s invalidates the goals domain to refresh every rendered list",
    (hook) => {
      expect(bodyOf(hook)).toContain("goals.all");
    },
  );

  it("useUpdateGoal also invalidates the single detail it touched, so the detail page refreshes immediately", () => {
    const body = bodyOf("useUpdateGoal");
    expect(body).toContain("goals.detail(");
  });

  it.each(GOAL_WRITES)("%s carries a named mutationKey so concurrent mutations are identifiable", (hook) => {
    expect(bodyOf(hook)).toContain("mutationKey:");
  });

  it("useCheckIn invalidates the detail, the full list, and the stats strip — stats change on every check-in", () => {
    const body = bodyOf("useCheckIn");
    expect(body).toContain("goals.detail(");
    expect(body).toContain("goals.all");
    expect(body).toContain("goals.stats()");
  });

  it("useAddGoalLink leaves the goals list alone and only touches the goal detail and links key", () => {
    const body = bodyOf("useAddGoalLink");
    expect(body).not.toContain("goals.all");
    expect(body).toContain("goals.detail(");
  });

  it("useRemoveGoalLink scopes invalidation to the detail and links — the list is not affected by a link change", () => {
    const body = bodyOf("useRemoveGoalLink");
    expect(body).not.toContain("goals.all");
    expect(body).toContain("goals.detail(");
  });

  it("useGoals uses the gated query with the build:goals:view permission so a denied read is not a hang", () => {
    const body = bodyOf("useGoals");
    expect(body).toContain("build:goals:view");
  });

  it("useGoal stale time is 30 seconds, matching the standard entity stale time", () => {
    const body = bodyOf("useGoal");
    expect(body).toContain("staleTime: 30_000");
  });

  it("every read hook forwards the abort signal so cancellation works", () => {
    for (const hook of ["useGoals", "useGoal", "useGoalStats"]) {
      expect(bodyOf(hook)).toContain("signal");
    }
  });
});
