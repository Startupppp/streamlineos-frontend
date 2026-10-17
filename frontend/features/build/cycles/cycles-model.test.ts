import { nextCycleStatus, statusActionLabel } from "./cycles-model";

describe("nextCycleStatus", () => {
  it("draft → active", () => {
    expect(nextCycleStatus("draft")).toBe("active");
  });

  it("active → completed", () => {
    expect(nextCycleStatus("active")).toBe("completed");
  });

  it("completed → active (reopen)", () => {
    expect(nextCycleStatus("completed")).toBe("active");
  });
});

describe("statusActionLabel", () => {
  it("draft → Start", () => {
    expect(statusActionLabel("draft")).toBe("Start");
  });

  it("active → Complete", () => {
    expect(statusActionLabel("active")).toBe("Complete");
  });

  it("completed → Reopen", () => {
    expect(statusActionLabel("completed")).toBe("Reopen");
  });
});
