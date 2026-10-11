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
    "%s patches the cache via setQueryData and never does a broad goals.all refetch",
    (hook) => {
      expect(bodyOf(hook)).toContain("setQueryData");
      expect(bodyOf(hook)).not.toContain("goals.all");
    },
  );

  it("useUpdateGoal patches the detail and every loaded list page from the response", () => {
    const body = bodyOf("useUpdateGoal");
    expect(body).toContain("goals.detail(");
    expect(body).toContain("goals.list()");
    expect(body).toContain("setQueryData");
  });

  it.each(GOAL_WRITES)("%s carries a named mutationKey so concurrent mutations are identifiable", (hook) => {
    expect(bodyOf(hook)).toContain("mutationKey:");
  });

  it("useCheckIn patches the detail and loaded lists from the response; stats are server-side aggregates so they are marked stale only", () => {
    const body = bodyOf("useCheckIn");
    expect(body).toContain("goals.detail(");
    expect(body).toContain("goals.list()");
    expect(body).toContain("goals.stats()");
    expect(body).not.toContain("goals.all");
  });

  it("useAddGoalLink patches the detail links array and list link counts from the response", () => {
    const body = bodyOf("useAddGoalLink");
    expect(body).not.toContain("goals.all");
    expect(body).toContain("goals.detail(");
    expect(body).toContain("goals.list()");
  });

  it("useRemoveGoalLink removes the link from the detail cache and decrements list link counts", () => {
    const body = bodyOf("useRemoveGoalLink");
    expect(body).not.toContain("goals.all");
    expect(body).toContain("goals.detail(");
    expect(body).toContain("goals.list()");
  });

  it("useGoals uses the gated query with the build:goals:view permission so a denied read is not a hang", () => {
    const body = bodyOf("useGoals");
    expect(body).toContain("build:goals:view");
  });

  it.each(["useGoals", "useGoalsPage", "useGoalStats"])(
    "%s keeps API failures inline so the goals surface can render its recovery state",
    (hook) => {
      expect(bodyOf(hook)).toContain("...INLINE_READ_ERROR");
    },
  );

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
