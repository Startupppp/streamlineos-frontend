import { STATUS_OPTIONS, HEALTH_OPTIONS, STATUS_LABELS, HEALTH_LABELS } from "./add-filter-popover";

const BACKEND_PROJECT_STATUS = ["ACTIVE", "COMPLETED", "ARCHIVED"];
const BACKEND_PROJECT_HEALTH = ["on_track", "at_risk", "off_track"];

describe("project filter options", () => {
  it("offers no status the project_status pgEnum rejects, because the list query parses status through z.enum and a rejected value 400s the whole directory", () => {
    for (const option of STATUS_OPTIONS) expect(BACKEND_PROJECT_STATUS).toContain(option);
  });

  it("offers every status the backend accepts, so a real filter is not missing from the menu", () => {
    expect([...STATUS_OPTIONS].sort()).toEqual([...BACKEND_PROJECT_STATUS].sort());
  });

  it("offers only the three health values the service computes, because a chip whose value no project carries filters to nothing forever", () => {
    expect([...HEALTH_OPTIONS].sort()).toEqual([...BACKEND_PROJECT_HEALTH].sort());
  });

  it("drops a filterStatus URL parameter naming a status the backend does not accept, because the value reaches the list request and a rejected one 400s the directory", () => {
    expect(STATUS_OPTIONS.find((s) => s === "PLANNING")).toBeUndefined();
    expect(STATUS_OPTIONS.find((s) => s === "'; DROP TABLE projects;--")).toBeUndefined();
    expect(STATUS_OPTIONS.find((s) => s === "ACTIVE")).toBe("ACTIVE");
  });

  it("drops a filterHealth URL parameter outside the computed health values", () => {
    expect(HEALTH_OPTIONS.find((h) => h === "healthy")).toBeUndefined();
    expect(HEALTH_OPTIONS.find((h) => h === "at_risk")).toBe("at_risk");
  });

  it("labels every option it offers, so no chip renders its raw enum value", () => {
    for (const option of STATUS_OPTIONS) expect(STATUS_LABELS[option]).toBeTruthy();
    for (const option of HEALTH_OPTIONS) expect(HEALTH_LABELS[option]).toBeTruthy();
  });
});
