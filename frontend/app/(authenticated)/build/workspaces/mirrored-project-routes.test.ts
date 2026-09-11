import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  MIRRORED_WORKSPACE_PROJECT_SUBPATHS,
  WORKSPACE_PROJECT_ROUTE_ROOT,
  hasWorkspaceMirror,
  projectSubPath,
} from "./mirrored-project-routes";

const ROOT = resolve(process.cwd(), WORKSPACE_PROJECT_ROUTE_ROOT);
const DYNAMIC_SEGMENT = /^\[.+\]$/;

function walkPages(dir: string, prefix: string, out: string[]): void {
  if (existsSync(join(dir, "page.tsx"))) out.push(prefix);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    walkPages(join(dir, entry.name), `${prefix}/${entry.name}`, out);
  }
}

function subPathsOnDisk(): string[] {
  const out: string[] = [];
  walkPages(ROOT, "", out);
  return out.sort();
}

describe("PM workspace project mirror registry", () => {
  it("finds the workspace project route root on disk", () => {
    expect(existsSync(ROOT)).toBe(true);
  });

  it("lists every mirrored sub-path and nothing that is not on disk", () => {
    expect([...MIRRORED_WORKSPACE_PROJECT_SUBPATHS].sort()).toEqual(
      subPathsOnDisk(),
    );
  });

  it("scans a non-empty tree so an empty walk cannot read as agreement", () => {
    expect(subPathsOnDisk().length).toBeGreaterThanOrEqual(5);
  });

  it("holds no dynamic segment, so exact sub-path matching stays sufficient", () => {
    const dynamic = subPathsOnDisk().filter((subPath) =>
      subPath.split("/").some((segment) => DYNAMIC_SEGMENT.test(segment)),
    );
    expect(dynamic).toEqual([]);
  });

  it("refuses the sub-paths the workspace tree never built", () => {
    for (const subPath of [
      "/backlog",
      "/sprints",
      "/bugs",
      "/qa",
      "/timeline",
      "/analytics",
    ])
      expect(hasWorkspaceMirror(subPath)).toBe(false);
  });

  it("accepts the sub-paths the workspace tree did build", () => {
    for (const subPath of MIRRORED_WORKSPACE_PROJECT_SUBPATHS)
      expect(hasWorkspaceMirror(subPath)).toBe(true);
  });

  it("reads the sub-path relative to the project root", () => {
    expect(projectSubPath("/build/20", "20")).toBe("");
    expect(projectSubPath("/build/20/backlog", "20")).toBe("/backlog");
    expect(projectSubPath("/build/20/qa/runs/7", "20")).toBe("/qa/runs/7");
  });

  it("returns null for a path that is not under the project root", () => {
    expect(projectSubPath("/build/200/backlog", "20")).toBeNull();
    expect(projectSubPath("/build/all", "20")).toBeNull();
  });
});
