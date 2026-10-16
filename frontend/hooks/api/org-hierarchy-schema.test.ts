import { dependencyPreviewContract } from "./org-hierarchy-schema";

const serverPreview = {
  unitId: "00000000-0000-0000-0000-000000000001",
  unitKind: "DEPARTMENT",
  mode: "archive",
  dependencies: [
    { key: "child_units", label: "Active child organization units", count: 2 },
  ],
  totalDependencies: 2,
};

describe("dependencyPreviewContract", () => {
  it("accepts the shape the server emits for an archive preview", () => {
    const parsed = dependencyPreviewContract.parse(serverPreview);

    expect(parsed.mode).toBe("archive");
    expect(parsed.dependencies).toHaveLength(1);
    expect(parsed.totalDependencies).toBe(2);
  });

  it("accepts a retire preview", () => {
    expect(
      dependencyPreviewContract.parse({ ...serverPreview, mode: "retire" })
        .mode,
    ).toBe("retire");
  });

  it("keeps the dependency list when the server sends an unknown mode", () => {
    const parsed = dependencyPreviewContract.parse({
      ...serverPreview,
      mode: "restore",
    });

    expect(parsed.dependencies).toEqual(serverPreview.dependencies);
    expect(parsed.mode).toBe("archive");
  });

  it("still rejects a payload whose dependency list is malformed", () => {
    expect(
      dependencyPreviewContract.safeParse({
        ...serverPreview,
        dependencies: [{ key: "x", label: "X", count: "many" }],
      }).success,
    ).toBe(false);
  });
});
