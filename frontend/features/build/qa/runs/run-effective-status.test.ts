type Status = "not_started" | "in_progress" | "completed" | "aborted";

interface Counts {
  total: number;
  notRun: number;
}

function deriveEffectiveStatus(storedStatus: Status, counts: Counts): string {
  if (storedStatus === "completed" || storedStatus === "aborted") return storedStatus;
  if (counts.total > 0 && counts.notRun === 0) return "completed";
  if (counts.total > counts.notRun) return "in_progress";
  return storedStatus;
}

describe("run effective status — badge shows stored status even when all results executed until derivation", () => {
  it("shows completed when all results have been executed and stored status is still in_progress", () => {
    expect(deriveEffectiveStatus("in_progress", { total: 5, notRun: 0 })).toBe("completed");
  });

  it("shows in_progress when some results remain not_run and stored status is not_started", () => {
    expect(deriveEffectiveStatus("not_started", { total: 5, notRun: 3 })).toBe("in_progress");
  });

  it("preserves stored completed status regardless of counts", () => {
    expect(deriveEffectiveStatus("completed", { total: 5, notRun: 2 })).toBe("completed");
  });

  it("preserves stored aborted status regardless of counts", () => {
    expect(deriveEffectiveStatus("aborted", { total: 5, notRun: 0 })).toBe("aborted");
  });

  it("shows not_started when no results have been executed", () => {
    expect(deriveEffectiveStatus("not_started", { total: 5, notRun: 5 })).toBe("not_started");
  });

  it("shows not_started when run has no results at all", () => {
    expect(deriveEffectiveStatus("not_started", { total: 0, notRun: 0 })).toBe("not_started");
  });
});
