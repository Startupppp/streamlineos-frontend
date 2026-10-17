import {
  COMMAND_CENTER_HEALTH_VALUES,
  COMMAND_CENTER_SCOPE_VALUES,
  isCommandCenterHealth,
  isCommandCenterScope,
  resolveProjectsStatValue,
} from "./command-center-model";

describe("isCommandCenterHealth", () => {
  it("returns true for each valid health value", () => {
    for (const v of COMMAND_CENTER_HEALTH_VALUES) {
      expect(isCommandCenterHealth(v)).toBe(true);
    }
  });

  it("returns false for an unknown string", () => {
    expect(isCommandCenterHealth("unknown")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isCommandCenterHealth("")).toBe(false);
  });
});

describe("isCommandCenterScope", () => {
  it("returns true for each valid scope value", () => {
    for (const v of COMMAND_CENTER_SCOPE_VALUES) {
      expect(isCommandCenterScope(v)).toBe(true);
    }
  });

  it("returns false for an unknown string", () => {
    expect(isCommandCenterScope("unknown")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isCommandCenterScope("")).toBe(false);
  });
});

describe("resolveProjectsStatValue", () => {
  it("returns the exact count when hasMore is false", () => {
    expect(resolveProjectsStatValue(7, false)).toBe(7);
  });

  it("returns 0 as the exact count when there are no projects and hasMore is false", () => {
    expect(resolveProjectsStatValue(0, false)).toBe(0);
  });

  it("returns a plus-suffixed string when hasMore is true", () => {
    expect(resolveProjectsStatValue(9, true)).toBe("9+");
  });

  it("returns a plus-suffixed string for any count when hasMore is true", () => {
    expect(resolveProjectsStatValue(5, true)).toBe("5+");
  });

  it("returns string type when hasMore is true and number type when hasMore is false", () => {
    expect(typeof resolveProjectsStatValue(9, true)).toBe("string");
    expect(typeof resolveProjectsStatValue(9, false)).toBe("number");
  });
});
