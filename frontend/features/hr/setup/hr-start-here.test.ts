import { hrSetupProgress, hrStartHereSteps, type HrSetupSignals } from "./hr-start-here";

const NOTHING: HrSetupSignals = { people: 0, leaveTypes: 0, shifts: 0, documents: 0 };

describe("hrStartHereSteps", () => {
  it("orders the path People → Leave → Attendance → Documents, because each step unblocks the next", () => {
    expect(hrStartHereSteps(NOTHING).map((step) => step.id)).toEqual([
      "people",
      "leave",
      "shifts",
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

    expect(steps.find((step) => step.status === "next")?.id).toBe("shifts");
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
    // This assertion named /hr/attendance for the shift step and so agreed with
    // the defect: attendance offers no way to create a shift, which is what the
    // step asks for and what its completion counts.
    expect(hrStartHereSteps(NOTHING).map((step) => step.href)).toEqual([
      "/hr/onboarding",
      "/hr/settings/policies",
      "/hr/shifts",
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

/**
 * The "Define a shift" step linked to /hr/attendance, which has no way to
 * create a shift. Somebody working down the checklist arrived at the wrong
 * screen, and because the step's completion is counted in shifts, it stayed
 * incomplete however long they looked at attendance.
 *
 * Every step's destination is asserted here, not just the one that broke: a
 * checklist whose whole job is to send people somewhere should not be able to
 * send them somewhere else without a test noticing.
 */
describe("every Start here step links where it says it does", () => {
  const steps = hrStartHereSteps({ people: 0, leaveTypes: 0, shifts: 0, documents: 0 });
  const hrefOf = (id: string): string | undefined => steps.find((step) => step.id === id)?.href;

  it("sends 'Define a shift' to the shifts screen, not to attendance", () => {
    expect(hrefOf("shifts")).toBe("/hr/shifts");
  });

  it.each([
    ["people", "/hr/onboarding"],
    ["leave", "/hr/settings/policies"],
    ["shifts", "/hr/shifts"],
    ["documents", "/hr/documents"],
  ])("sends %s to %s", (id, href) => {
    expect(hrefOf(id)).toBe(href);
  });

  it("gives every step an action label naming what that screen does", () => {
    for (const step of steps) expect(step.actionLabel.trim().length).toBeGreaterThan(0);
  });
});
