import { formatGroupLabel } from "./list-view-group";

describe("formatGroupLabel", () => {
  it("maps status enums to human labels (C13)", () => {
    expect(formatGroupLabel("IN_PROGRESS")).toBe("In Progress");
    expect(formatGroupLabel("TODO")).toBe("To Do");
    expect(formatGroupLabel("DONE")).toBe("Done");
  });
});
