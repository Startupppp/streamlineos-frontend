const VIEW_MODES = ["list", "grid"] as const;
type ViewMode = (typeof VIEW_MODES)[number];

function parseViewMode(raw: string | null): ViewMode {
  return VIEW_MODES.find((v) => v === raw) ?? "list";
}

describe("projects view mode — bad paths", () => {
  it("falls back to list for an unknown view param", () => {
    expect(parseViewMode("kanban")).toBe("list");
    expect(parseViewMode("")).toBe("list");
    expect(parseViewMode(null)).toBe("list");
  });

  it("keeps grid on the happy path", () => {
    expect(parseViewMode("grid")).toBe("grid");
  });
});
