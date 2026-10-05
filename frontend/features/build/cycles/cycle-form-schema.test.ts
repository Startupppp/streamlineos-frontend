import { buildCycleConflictDiffs, type CycleFormValues } from "./cycle-form-schema";
import type { Cycle } from "@/types/projects";

const BASE_CYCLE: Cycle = {
  id: 1,
  orgId: "org-1",
  projectId: 10,
  name: "Cycle One",
  description: "A description",
  goal: "Ship feature",
  capacity: 40,
  version: 1,
  status: "active",
  startDate: "2026-10-01",
  endDate: "2026-10-14",
};

const BASE_FORM: CycleFormValues = {
  name: "Cycle One",
  description: "A description",
  goal: "Ship feature",
  capacity: "40",
  startDate: "2026-10-01",
  endDate: "2026-10-14",
};

describe("buildCycleConflictDiffs", () => {
  it("returns empty array when form values match server values", () => {
    expect(buildCycleConflictDiffs(BASE_FORM, BASE_CYCLE)).toHaveLength(0);
  });

  it("detects a name change", () => {
    const diffs = buildCycleConflictDiffs({ ...BASE_FORM, name: "New Name" }, BASE_CYCLE);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toMatchObject({ key: "name", serverValue: "Cycle One", pendingValue: "New Name" });
  });

  it("detects a description change", () => {
    const diffs = buildCycleConflictDiffs({ ...BASE_FORM, description: "Updated" }, BASE_CYCLE);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toMatchObject({ key: "description" });
  });

  it("treats empty capacity string as null", () => {
    const diffs = buildCycleConflictDiffs({ ...BASE_FORM, capacity: "" }, BASE_CYCLE);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toMatchObject({ key: "capacity", serverValue: "40", pendingValue: "—" });
  });

  it("returns no diff when capacity is 0 and server is also 0", () => {
    const cycle = { ...BASE_CYCLE, capacity: 0 };
    const form = { ...BASE_FORM, capacity: "0" };
    expect(buildCycleConflictDiffs(form, cycle)).toHaveLength(0);
  });

  it("returns multiple diffs when multiple fields differ", () => {
    const form = { ...BASE_FORM, name: "Changed", startDate: "2026-11-01" };
    const diffs = buildCycleConflictDiffs(form, BASE_CYCLE);
    expect(diffs).toHaveLength(2);
  });

  it("handles null server values by formatting them as em-dash", () => {
    const cycle = { ...BASE_CYCLE, description: null, goal: null };
    const form = { ...BASE_FORM, description: "text", goal: "some goal" };
    const diffs = buildCycleConflictDiffs(form, cycle);
    expect(diffs.find((d) => d.key === "description")?.serverValue).toBe("—");
    expect(diffs.find((d) => d.key === "goal")?.serverValue).toBe("—");
  });
});
