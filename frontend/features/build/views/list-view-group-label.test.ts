import { statusConfig } from "@/features/build/shared/types";

function formatGroupLabel(groupKey: string): string {
  return statusConfig[groupKey]?.label ?? groupKey.replaceAll("_", " ");
}

describe("list group header labels", () => {
  it("maps raw status enums to human labels", () => {
    expect(formatGroupLabel("TODO")).toBe("To Do");
    expect(formatGroupLabel("IN_PROGRESS")).toBe("In Progress");
    expect(formatGroupLabel("IN_REVIEW")).toBe("In Review");
  });

  it("falls back without inventing a crash for unknown keys", () => {
    expect(formatGroupLabel("CUSTOM_STATUS")).toBe("CUSTOM STATUS");
  });
});
