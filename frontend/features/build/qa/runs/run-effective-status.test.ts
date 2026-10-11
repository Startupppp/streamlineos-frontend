import { deriveRunDisplayStatus } from "./run-effective-status";

describe("run display status — only the server completes or aborts a run", () => {
  it("keeps an in-progress run in progress when every result is executed, so Complete Run stays reachable", () => {
    expect(deriveRunDisplayStatus("in_progress", { total: 5, notRun: 0 })).toBe("in_progress");
  });

  it("shows in_progress when some results are executed and stored status is not_started", () => {
    expect(deriveRunDisplayStatus("not_started", { total: 5, notRun: 3 })).toBe("in_progress");
  });

  it("preserves stored completed status regardless of counts", () => {
    expect(deriveRunDisplayStatus("completed", { total: 5, notRun: 2 })).toBe("completed");
  });

  it("preserves stored aborted status regardless of counts", () => {
    expect(deriveRunDisplayStatus("aborted", { total: 5, notRun: 0 })).toBe("aborted");
  });

  it("shows not_started when no results have been executed", () => {
    expect(deriveRunDisplayStatus("not_started", { total: 5, notRun: 5 })).toBe("not_started");
  });

  it("shows not_started when run has no results at all", () => {
    expect(deriveRunDisplayStatus("not_started", { total: 0, notRun: 0 })).toBe("not_started");
  });
});
