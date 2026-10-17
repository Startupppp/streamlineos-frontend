import { projectHealthLabel, PROJECT_HEALTH_LABEL } from "./project-health";

describe("projectHealthLabel — single source of truth", () => {
  it("labels portfolio health consistently", () => {
    expect(projectHealthLabel("on_track")).toBe("On track");
    expect(projectHealthLabel("at_risk")).toBe("At risk");
    expect(projectHealthLabel("off_track")).toBe("Off track");
    expect(PROJECT_HEALTH_LABEL.at_risk).toBe("At risk");
  });

  it("maps analytics health statuses onto the same vocabulary", () => {
    expect(projectHealthLabel("AT_RISK")).toBe("At risk");
    expect(projectHealthLabel("CRITICAL")).toBe("Off track");
    expect(projectHealthLabel("GOOD")).toBe("On track");
    expect(projectHealthLabel("NOT_STARTED")).toBe("Not started");
  });

  it("does not crash on empty input", () => {
    expect(projectHealthLabel(null)).toBe("On track");
    expect(projectHealthLabel(undefined)).toBe("On track");
  });
});
