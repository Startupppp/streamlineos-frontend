import { displayConflictValue, buildReleaseConflictDiffs } from "./release-form-model";
import type { Release } from "@/types/projects";

const baseRelease: Release = {
  id: 1,
  projectId: 10,
  name: "v1.0",
  version: "1.0.0",
  rowVersion: 1,
  description: null,
  status: "draft",
  releaseDate: null,
  publishedAt: null,
  readiness: null,
  riskLevel: null,
  ticketCount: 0,
  createdBy: null,
  createdByUser: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("displayConflictValue", () => {
  it("returns Not set for null", () => {
    expect(displayConflictValue(null)).toBe("Not set");
  });

  it("returns Not set for undefined", () => {
    expect(displayConflictValue(undefined)).toBe("Not set");
  });

  it("returns Not set for empty string", () => {
    expect(displayConflictValue("")).toBe("Not set");
  });

  it("returns stringified value for non-empty string", () => {
    expect(displayConflictValue("released")).toBe("released");
  });

  it("returns stringified value for number", () => {
    expect(displayConflictValue(42)).toBe("42");
  });
});

describe("buildReleaseConflictDiffs", () => {
  it("returns empty array when values match baseline", () => {
    const diffs = buildReleaseConflictDiffs(
      { name: "v1.0", version: "1.0.0", status: "draft", releaseDate: null, description: null, readiness: null, riskLevel: null },
      baseRelease,
    );
    expect(diffs).toHaveLength(0);
  });

  it("detects name change", () => {
    const diffs = buildReleaseConflictDiffs(
      { name: "v2.0", version: "1.0.0", status: "draft", releaseDate: null, description: null, readiness: null, riskLevel: null },
      baseRelease,
    );
    expect(diffs).toHaveLength(1);
    expect(diffs[0]?.key).toBe("name");
    expect(diffs[0]?.pendingValue).toBe("v2.0");
    expect(diffs[0]?.serverValue).toBe("v1.0");
  });

  it("returns no diff when descriptions have identical text after stripping markup", () => {
    const diffs = buildReleaseConflictDiffs(
      { name: "v1.0", version: "1.0.0", status: "draft", releaseDate: null, description: "<p>same</p>", readiness: null, riskLevel: null },
      { ...baseRelease, description: "<p>same</p>" },
    );
    expect(diffs).toHaveLength(0);
  });

  it("detects description change after stripping markup", () => {
    const diffs = buildReleaseConflictDiffs(
      { name: "v1.0", version: "1.0.0", status: "draft", releaseDate: null, description: "<p>new notes</p>", readiness: null, riskLevel: null },
      { ...baseRelease, description: "<p>old notes</p>" },
    );
    expect(diffs).toHaveLength(1);
    expect(diffs[0]?.key).toBe("description");
  });
});
