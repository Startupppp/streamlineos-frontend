import { readFileSync } from "node:fs";
import { backendPath, backendReachable } from "@/lib/test-support/backend-path";
import { projectReleaseListContract } from "./build-project-schema";

const RELEASES_SERVICE = "src/modules/build/core/releases/projects-releases.service.ts";
const RELEASES_SCHEMAS = "src/modules/build/core/dto/releases.schemas.ts";

function projectionKeys(relativePath: string, method: string): string[] {
  const source = readFileSync(backendPath(relativePath), "utf8");
  const start = source.indexOf(method);
  const selectAt = source.indexOf(".select({", start);
  const block = source.slice(selectAt, source.indexOf(".from(", selectAt));
  return [...block.matchAll(/^\s+(\w+):/gm)].map((match) => match[1]!);
}

function firstRowKeys(parsed: { data: object[] }): string[] {
  const row = parsed.data[0];
  if (row === undefined) throw new Error("Expected a parsed contract row");
  return Object.keys(row);
}

const RELEASE_ROW = {
  id: 5,
  projectId: 10,
  name: "v1.2.0",
  version: "1.2.0",
  rowVersion: 3,
  description: null,
  status: "draft",
  releaseDate: null,
  createdBy: null,
  ticketCount: 0,
  createdAt: "2026-09-19T10:00:00.000Z",
  updatedAt: "2026-09-19T10:00:00.000Z",
};

const CURSOR_PAGE = {
  data: [RELEASE_ROW],
  pagination: { limit: 25, hasMore: false, nextCursor: null },
};

describe("releases list contract matches the projects-releases service projection", () => {
  it("reaches the backend releases service, so a broken scan fails instead of passing vacuously", () => {
    expect(backendReachable(RELEASES_SERVICE)).toBe(true);
    expect(projectionKeys(RELEASES_SERVICE, "async listReleases(").length).toBeGreaterThanOrEqual(9);
  });

  it("asks for no column the releases projection omits, which is what throws once a release exists", () => {
    const projected = new Set(projectionKeys(RELEASES_SERVICE, "async listReleases("));
    const required = firstRowKeys(projectReleaseListContract.parse(CURSOR_PAGE));
    expect(required.filter((key) => !projected.has(key) && key !== "ticketCount")).toEqual([]);
  });

  it("parses a cursor page envelope with one release row", () => {
    const parsed = projectReleaseListContract.parse(CURSOR_PAGE);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0]?.id).toBe(5);
    expect(parsed.pagination.hasMore).toBe(false);
    expect(parsed.pagination.nextCursor).toBeNull();
  });

  it("rejects a status outside the three enum values the backend emits", () => {
    expect(() =>
      projectReleaseListContract.parse({ ...CURSOR_PAGE, data: [{ ...RELEASE_ROW, status: "RELEASED" }] }),
    ).toThrow();
    expect(() =>
      projectReleaseListContract.parse({ ...CURSOR_PAGE, data: [{ ...RELEASE_ROW, status: "published" }] }),
    ).toThrow();
  });

  it("accepts every valid release status the backend can emit", () => {
    const validStatuses = ["draft", "released", "archived"];
    for (const status of validStatuses) {
      expect(() =>
        projectReleaseListContract.parse({ ...CURSOR_PAGE, data: [{ ...RELEASE_ROW, status }] }),
      ).not.toThrow();
    }
  });

  it("keeps ticketCount on the list row so a secondary fetch is not needed per release", () => {
    const parsed = projectReleaseListContract.parse(CURSOR_PAGE);
    expect(parsed.data[0]?.ticketCount).toBe(0);
  });

  it("keeps version on the list row so the release identifier is always visible", () => {
    const parsed = projectReleaseListContract.parse(CURSOR_PAGE);
    expect(parsed.data[0]?.version).toBe("1.2.0");
  });

  it("keeps rowVersion on the list row because the update body cannot be built without it", () => {
    const parsed = projectReleaseListContract.parse(CURSOR_PAGE);
    expect(parsed.data[0]?.rowVersion).toBe(3);
  });

  it("drops a release row that omits rowVersion, so a projection regression fails here and not as a 400 on save", () => {
    const { rowVersion: _omitted, ...withoutToken } = RELEASE_ROW;
    expect(() =>
      projectReleaseListContract.parse({ ...CURSOR_PAGE, data: [withoutToken] }),
    ).toThrow();
  });

  it("confirms the backend update schema requires rowVersion and rejects unknown keys, so an untokened PATCH is a 400", () => {
    const source = readFileSync(backendPath(RELEASES_SCHEMAS), "utf8");
    const start = source.indexOf("export const updateReleaseSchema");
    expect(start).toBeGreaterThan(-1);
    const block = source.slice(start, source.indexOf("}).strict()", start) + "}).strict()".length);
    expect(block).toContain("rowVersion: z.number().int().positive(),");
    expect(block).not.toContain("rowVersion: z.number().int().positive().optional()");
    expect(block).toContain("}).strict()");
  });

  it("confirms the backend releases service has server cursor pagination keeping reads bounded", () => {
    const source = readFileSync(backendPath(RELEASES_SERVICE), "utf8");
    expect(source).toMatch(/limit\s*\+\s*1/);
  });

  it("confirms the backend releases service orders by id DESC so the list is deterministic", () => {
    const source = readFileSync(backendPath(RELEASES_SERVICE), "utf8");
    expect(source).toContain("desc(projectReleases.id)");
  });
});
