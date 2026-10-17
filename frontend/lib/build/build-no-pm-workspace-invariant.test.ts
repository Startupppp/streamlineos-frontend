import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");
const THIS_FILE = "lib/build/build-no-pm-workspace-invariant.test.ts";

const SCANNED_DIRECTORIES = [
  "app",
  "features/build",
  "hooks/api/build",
  "lib/build",
  "lib/rbac",
  "types/projects",
] as const;

const SOURCE_EXTENSIONS = [".ts", ".tsx"] as const;

const REMOVAL_LEDGERS = [
  "lib/build/build-redirect-route-removal.test.ts",
  "lib/build/build-route-manifest.test.ts",
] as const;

function isTestFile(p: string): boolean {
  return p.endsWith(".test.ts") || p.endsWith(".test.tsx") ||
    p.endsWith(".spec.ts") || p.endsWith(".spec.tsx");
}

function sourceFiles(): string[] {
  const found: string[] = [];
  for (const directory of SCANNED_DIRECTORIES) {
    for (const entry of readdirSync(path.join(ROOT, directory), { recursive: true })) {
      const relative = path.join(directory, String(entry)).split(path.sep).join("/");
      if (!SOURCE_EXTENSIONS.some((extension) => relative.endsWith(extension))) continue;
      if (relative === THIS_FILE) continue;
      if ((REMOVAL_LEDGERS as readonly string[]).includes(relative)) continue;
      if (isTestFile(relative)) continue;
      found.push(relative);
    }
  }
  return found;
}

function read(file: string): string {
  return readFileSync(path.join(ROOT, file), "utf8");
}

function offendersFor(files: readonly string[], token: string): string[] {
  return files.filter((file) => read(file).includes(token));
}

describe("PM Workspace removal invariant — these tokens must never reappear under the Build source tree", () => {
  const files = sourceFiles();

  it("scans a non-trivial corpus across app/, features/build/, hooks/api/build/, lib/build/, lib/rbac/ and types/projects/, so zero offenders below means clean and not unscanned", () => {
    expect(files.length).toBeGreaterThan(200);
    expect(files).toContain("lib/build/build-scope.ts");
  });

  it("never reintroduces the pmWorkspaceId field that the BuildScope, Project and ManagedProduct shapes used to carry", () => {
    const offenders = offendersFor(files, "pmWorkspaceId");
    expect(offenders).toEqual([]);
  });

  it("never reintroduces the snake_case pm_workspace_id wire field some backend payloads used to send", () => {
    const offenders = offendersFor(files, "pm_workspace_id");
    expect(offenders).toEqual([]);
  });

  it("never reintroduces the pmWorkspaces query-key or hook namespace that the PM Workspace list used to live under", () => {
    const offenders = offendersFor(files, "pmWorkspaces");
    expect(offenders).toEqual([]);
  });

  it("never reintroduces a build:workspaces: permission key now that the six PM Workspace permission keys are retired", () => {
    const offenders = offendersFor(files, "build:workspaces:");
    expect(offenders).toEqual([]);
  });

  it("never reintroduces the literal label Default Workspace that the old scope switcher used to render", () => {
    const offenders = offendersFor(files, "Default Workspace");
    expect(offenders).toEqual([]);
  });

  it.each(REMOVAL_LEDGERS)(
    "%s is exempt from the token scan only because it is the ledger that proves the route is gone — it must still name every retired workspace URL",
    (ledger) => {
      const source = read(ledger);
      expect(source).toContain("/build/workspaces");
      expect(source).not.toMatch(/from\s+["'][^"']*pm-workspaces/);
    },
  );

  it("keeps BuildScopeType to exactly organization, product and project, because a workspace member would resurrect the retired scope kind", () => {
    const buildScopeSource = read("lib/build/build-scope.ts");
    const declaration = /export type BuildScopeType =([\s\S]*?);/.exec(buildScopeSource);
    expect(declaration).not.toBeNull();
    const members = declaration?.[1] ?? "";
    expect(members).toContain('"organization"');
    expect(members).toContain('"product"');
    expect(members).toContain('"project"');
    expect(members).not.toContain('"workspace"');
  });
});
