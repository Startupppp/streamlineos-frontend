import { createViewSchema, MAX_VIEW_NAME } from "./create-view-schema";

describe("createViewSchema — name length", () => {
  it("rejects a name longer than MAX_VIEW_NAME characters", () => {
    const result = createViewSchema.safeParse({
      name: "a".repeat(MAX_VIEW_NAME + 1),
      layoutType: "board",
      visibility: "shared",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameIssue = result.error.issues.find((i) => i.path[0] === "name");
      expect(nameIssue?.message).toContain(String(MAX_VIEW_NAME));
    }
  });

  it("accepts a name of exactly MAX_VIEW_NAME characters", () => {
    const result = createViewSchema.safeParse({
      name: "a".repeat(MAX_VIEW_NAME),
      layoutType: "board",
      visibility: "shared",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = createViewSchema.safeParse({
      name: "",
      layoutType: "board",
      visibility: "shared",
    });
    expect(result.success).toBe(false);
  });
});
