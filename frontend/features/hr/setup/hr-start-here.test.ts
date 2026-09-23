import { hrSetupProgress, hrStartHereSteps, type HrSetupSignals } from "./hr-start-here";

const NOTHING: HrSetupSignals = { people: 0, leaveTypes: 0, shifts: 0, documents: 0 };

describe("hrStartHereSteps", () => {
  it("orders the path People → Leave → Attendance → Documents, because each step unblocks the next", () => {
    expect(hrStartHereSteps(NOTHING).map((step) => step.id)).toEqual([
      "people",
      "leave",
      "attendance",
      "documents",
    ]);
  });

  it("marks exactly one step as next so a founder is never shown four equal calls to action", () => {
    const steps = hrStartHereSteps(NOTHING);

    expect(steps.filter((step) => step.status === "next").map((s) => s.id)).toEqual(["people"]);
    expect(steps.filter((step) => step.status === "todo")).toHaveLength(3);
  });

  it("advances next past the steps already done rather than restarting at the top", () => {
    const steps = hrStartHereSteps({ ...NOTHING, people: 3, leaveTypes: 2 });

    expect(steps.find((step) => step.status === "next")?.id).toBe("attendance");
    expect(steps.filter((step) => step.status === "done").map((s) => s.id)).toEqual([
      "people",
      "leave",
    ]);
  });

  it("treats a signal the viewer cannot read as unknown, never as an unfinished step", () => {
    const steps = hrStartHereSteps({ ...NOTHING, documents: null });

    expect(steps.find((step) => step.id === "documents")?.status).toBe("unknown");
  });

  it("still names a next step when an earlier signal is unreadable, so the checklist stays actionable", () => {
    const steps = hrStartHereSteps({ people: null, leaveTypes: 0, shifts: 0, documents: 0 });

    expect(steps.find((step) => step.status === "next")?.id).toBe("leave");
  });

  it("sends each step somewhere that can actually complete it", () => {
    expect(hrStartHereSteps(NOTHING).map((step) => step.href)).toEqual([
      "/hr/onboarding",
      "/hr/settings/policies",
      "/hr/attendance",
      "/hr/documents",
    ]);
  });
});

describe("hrSetupProgress", () => {
  it("counts only the steps it can actually see, so a restricted viewer is not told 0 of 4", () => {
    const steps = hrStartHereSteps({ people: 5, leaveTypes: 1, shifts: null, documents: null });

    expect(hrSetupProgress(steps)).toEqual({ done: 2, known: 2, complete: true });
  });

  it("reports incomplete while any visible step is outstanding", () => {
    expect(hrSetupProgress(hrStartHereSteps({ ...NOTHING, people: 1 }))).toEqual({
      done: 1,
      known: 4,
      complete: false,
    });
  });

  it("is never complete when nothing at all is readable, so the panel does not vanish on a permissions error", () => {
    const steps = hrStartHereSteps({ people: null, leaveTypes: null, shifts: null, documents: null });

    expect(hrSetupProgress(steps).complete).toBe(false);
  });
});
