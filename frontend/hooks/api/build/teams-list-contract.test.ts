import { readFileSync } from "node:fs";
import { backendPath, backendReachable } from "@/lib/test-support/backend-path";
import { teamListItemContract, teamPageContract } from "./teams-schema";

const BACKEND_SERVICE = "src/modules/build/teams/teams.service.ts";

function listProjectionKeys(): string[] {
  const source = readFileSync(backendPath(BACKEND_SERVICE), "utf8");
  const start = source.indexOf("async listTeams(");
  const selectAt = source.indexOf(".select({", start);
  const block = source.slice(selectAt, source.indexOf(".from(projectTeams)", selectAt));
  return [...block.matchAll(/^\s{8}(\w+):/gm)].map((match) => match[1]!);
}

const LIST_ROW = {
  id: 7,
  orgId: "org-1",
  name: "Delivery Squad",
  key: "DELIV",
  icon: null,
  color: null,
  isPrivate: false,
  createdAt: "2026-09-18T10:00:00.000Z",
  updatedAt: "2026-09-18T10:00:00.000Z",
  memberCount: 3,
};

describe("the teams list contract describes the rows GET /build/teams actually sends", () => {
  it("reaches the backend service, so a broken scan fails instead of passing vacuously", () => {
    expect(backendReachable(BACKEND_SERVICE)).toBe(true);
    expect(listProjectionKeys().length).toBeGreaterThanOrEqual(9);
  });

  it("asks for no column the list projection omits, which is what threw the moment a team existed", () => {
    const projected = new Set(listProjectionKeys());
    const required = Object.keys(teamListItemContract.shape);
    expect(required.filter((key) => !projected.has(key))).toEqual([]);
  });

  it("keeps memberCount, so the Members column reads the server count instead of a stripped zero", () => {
    expect(teamPageContract.parse({
      data: [LIST_ROW],
      pagination: { limit: 50, hasMore: false, nextCursor: null },
    }).data[0]?.memberCount).toBe(3);
  });
});
