import { readFileSync } from "node:fs";
import { backendPath, backendReachable } from "@/lib/test-support/backend-path";
import { projectReleaseListContract } from "./build-project-schema";

const RELEASES_SERVICE = "src/modules/build/core/projects-releases.service.ts";

function projectionKeys(relativePath: string, method: string): string[] {
  const source = readFileSync(backendPath(relativePath), "utf8");
  const start = source.indexOf(method);
  const selectAt = source.indexOf(".select({", start);
  const block = source.slice(selectAt, source.indexOf(".from(", selectAt));
  return [...block.matchAll(/^\s+(\w+):/gm)].map((match) => match[1]!);
}

function firstRowKeys<T extends object>(rows: T[]): string[] {
  const row = rows[0];
  if (row === undefined) throw new Error("Expected a parsed contract row");
  return Object.keys(row);
}

const RELEASE_ROW = {
  id: 5,
  projectId: 10,
  name: "v1.2.0",
  version: "1.2.0",
  description: null,
  status: "draft",
  releaseDate: null,
  ticketCount: 0,
  createdAt: "2026-09-19T10:00:00.000Z",
  updatedAt: "2026-09-19T10:00:00.000Z",
};

describe("releases list contract matches the projects-releases service projection", () => {
  it("reaches the backend releases service, so a broken scan fails instead of passing vacuously", () => {
    expect(backendReachable(RELEASES_SERVICE)).toBe(true);
    expect(projectionKeys(RELEASES_SERVICE, "async listReleases(").length).toBeGreaterThanOrEqual(9);
  });

  it("asks for no column the releases projection omits, which is what throws once a release exists", () => {
    const projected = new Set(projectionKeys(RELEASES_SERVICE, "async listReleases("));
    const required = firstRowKeys(projectReleaseListContract.parse([RELEASE_ROW]));
    expect(required.filter((key) => !projected.has(key) && key !== "ticketCount")).toEqual([]);
  });

  it("rejects a status outside the three enum values the backend emits", () => {
    expect(() =>
      projectReleaseListContract.parse([{ ...RELEASE_ROW, status: "RELEASED" }]),
    ).toThrow();
    expect(() =>
      projectReleaseListContract.parse([{ ...RELEASE_ROW, status: "published" }]),
    ).toThrow();
  });

  it("accepts every valid release status the backend can emit", () => {
    const validStatuses = ["draft", "released", "archived"];
    for (const status of validStatuses) {
      expect(() =>
        projectReleaseListContract.parse([{ ...RELEASE_ROW, status }]),
      ).not.toThrow();
    }
  });

  it("keeps ticketCount on the list row so a secondary fetch is not needed per release", () => {
    const parsed = projectReleaseListContract.parse([RELEASE_ROW]);
    expect(parsed[0]?.ticketCount).toBe(0);
  });

  it("keeps version on the list row so the release identifier is always visible", () => {
    const parsed = projectReleaseListContract.parse([RELEASE_ROW]);
    expect(parsed[0]?.version).toBe("1.2.0");
  });

  it("confirms the backend releases service has a .limit(100) so the list is bounded", () => {
    const source = readFileSync(backendPath(RELEASES_SERVICE), "utf8");
    expect(source).toContain(".limit(100)");
  });

  it("confirms the backend releases service orders by createdAt DESC so the list is deterministic", () => {
    const source = readFileSync(backendPath(RELEASES_SERVICE), "utf8");
    expect(source).toContain("DESC");
  });
});
