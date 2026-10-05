import { validateRename, MAX_COLUMN_NAME } from "./kanban-column-header-model";

describe("validateRename", () => {
  it("returns error for empty name", () => {
    expect(validateRename("", "Old", [])).toBe("Name is required");
  });

  it("returns error for name with no letters or numbers", () => {
    expect(validateRename("---", "Old", [])).toBe("Name must contain at least one letter or number");
  });

  it("returns error when name exceeds MAX_COLUMN_NAME", () => {
    const longName = "a".repeat(MAX_COLUMN_NAME + 1);
    const result = validateRename(longName, "Old", []);
    expect(result).toContain(String(MAX_COLUMN_NAME));
  });

  it("returns null when name is same as current (case-insensitive)", () => {
    expect(validateRename("In Progress", "in progress", [])).toBeNull();
  });

  it("returns error for duplicate name (case-insensitive)", () => {
    expect(validateRename("done", "Old", ["Done", "TODO"])).toBe("A column with this name already exists");
  });

  it("returns null for a valid unique rename", () => {
    expect(validateRename("New Name", "Old", ["Done", "TODO"])).toBeNull();
  });
});
