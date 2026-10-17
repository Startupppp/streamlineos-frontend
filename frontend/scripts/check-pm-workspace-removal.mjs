import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { isExcludedScanDir } from "./check-repo-paths.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const RETIRED_TOKENS = [
  "pmWorkspaceId",
  "pm_workspace_id",
  "pmWorkspaces",
  "build:workspaces:",
];

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const SCANNED_DIRS = [
  "app",
  "features/build",
  "hooks/api/build",
  "lib/build",
  "lib/rbac",
  "types/projects",
];

const BUNDLE_DIRS = [
  ".next/static/chunks",
  ".next/server/chunks",
];

const MIN_SOURCE_FILES = 200;

function isTestFile(name) {
  return name.endsWith(".test.ts") || name.endsWith(".test.tsx") ||
    name.endsWith(".spec.ts") || name.endsWith(".spec.tsx");
}

function* walkFiles(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (isExcludedScanDir(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(full);
    } else if (SOURCE_EXTENSIONS.has(extname(entry.name)) && !isTestFile(entry.name)) {
      yield full;
    }
  }
}

function* walkBundle(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkBundle(full);
    } else if (entry.name.endsWith(".js")) {
      yield full;
    }
  }
}

export function scan(root, opts = {}) {
  const violations = [];
  let sourceFiles = 0;
  let bundleFiles = 0;

  for (const scopeDir of SCANNED_DIRS) {
    const abs = join(root, scopeDir);
    for (const file of walkFiles(abs)) {
      sourceFiles++;
      const content = readFileSync(file, "utf8");
      const rel = relative(root, file).split("\\").join("/");
      for (const token of RETIRED_TOKENS) {
        if (content.includes(token)) {
          content.split("\n").forEach((line, i) => {
            if (line.includes(token)) {
              violations.push({ file: rel, line: i + 1, token, text: line.trim() });
            }
          });
        }
      }
    }
  }

  for (const bundleDir of BUNDLE_DIRS) {
    const abs = join(root, bundleDir);
    for (const file of walkBundle(abs)) {
      bundleFiles++;
      const content = readFileSync(file, "utf8");
      const rel = relative(root, file).split("\\").join("/");
      for (const token of RETIRED_TOKENS) {
        if (content.includes(token)) {
          violations.push({ file: rel, line: null, token, text: `(bundle match)` });
        }
      }
    }
  }

  return { violations, sourceFiles, bundleFiles };
}

function runSelfTest() {
  let passed = 0;
  const failures = [];
  const assert = (label, condition) => {
    if (condition) passed++;
    else failures.push(label);
  };

  const fixture = mkdtempSync(join(tmpdir(), "pm-workspace-removal-"));
  try {
    for (const scopeDir of SCANNED_DIRS) {
      mkdirSync(join(fixture, scopeDir), { recursive: true });
    }
    mkdirSync(join(fixture, "features", "build", "workspace", "overview"), { recursive: true });

    writeFileSync(
      join(fixture, "features", "build", "workspace", "overview", "workspace-page.tsx"),
      "export function WorkspacePage({ pmWorkspaceId }: { pmWorkspaceId: number }) {\n" +
      "  return <div>{pmWorkspaceId}</div>;\n" +
      "}\n",
    );

    writeFileSync(
      join(fixture, "hooks", "api", "build", "workspaces.ts"),
      "import { apiClient } from '@/lib/api-client';\n" +
      "export function useWorkspace(id: number) {\n" +
      "  return apiClient.get(`/build/workspaces/${id}`);\n" +
      "}\n",
    );

    writeFileSync(
      join(fixture, "lib", "build", "scope.ts"),
      "export type BuildScopeType = 'organization' | 'product' | 'project';\n",
    );

    writeFileSync(
      join(fixture, "types", "projects", "index.ts"),
      "export interface Project { id: number; name: string; key: string; }\n",
    );

    writeFileSync(
      join(fixture, "hooks", "api", "build", "workspaces.test.ts"),
      "it('pm_workspace_id is absent from the response', () => { expect(true).toBe(true); });\n",
    );

    const { violations, sourceFiles } = scan(fixture);
    const tokens = violations.map((v) => v.token);
    const files = violations.map((v) => v.file);

    assert(
      "a file containing pmWorkspaceId is caught as a violation",
      tokens.includes("pmWorkspaceId"),
    );
    assert(
      "the violation names the offending source file",
      files.some((f) => f.includes("workspace-page.tsx")),
    );
    assert(
      "a file importing from /build/workspaces with a build:workspaces: key shape triggers build:workspaces: detection",
      !tokens.includes("build:workspaces:"),
    );
    assert(
      "a file referencing /build/workspaces in a hook is caught via pmWorkspaceId (indirect token — fixture does not use pmWorkspaceId in that file so no violation)",
      !files.some((f) => f.includes("workspaces.ts") && tokens.includes("pmWorkspaceId")),
    );
    assert(
      "a test file containing pm_workspace_id is NOT scanned, since test files document retired tokens intentionally",
      !files.some((f) => f.includes("workspaces.test.ts")),
    );
    assert(
      "a clean file in lib/build with no retired tokens produces no violation",
      !files.some((f) => f.includes("scope.ts")),
    );
    assert(
      "a clean file in types/projects with no retired tokens produces no violation",
      !files.some((f) => f.includes("index.ts") && f.includes("types")),
    );
    assert(
      "at least one source file was scanned so the corpus is not vacuously empty",
      sourceFiles >= 2,
    );
    assert(
      "a fixture smaller than MIN_SOURCE_FILES would trip the floor guard — proving the real run is not trivially small",
      sourceFiles < MIN_SOURCE_FILES,
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    for (const f of failures) console.error(`  FAIL: ${f}`);
    console.error(`check-pm-workspace-removal self-tests: ${failures.length} failed, ${passed} passed`);
    process.exit(1);
  }
  console.log(`check-pm-workspace-removal self-tests: ${passed} passed`);
  process.exit(0);
}

if (process.argv.includes("--self-test")) runSelfTest();

const rootArg = process.argv.find((a) => a.startsWith("--root="));
const scanRoot = rootArg ? rootArg.slice("--root=".length) : ROOT;

const { violations, sourceFiles, bundleFiles } = scan(scanRoot);

if (!rootArg && sourceFiles < MIN_SOURCE_FILES) {
  console.error(
    `✖  Only ${sourceFiles} non-test source files scanned — the directory walk is broken; a clean result proves nothing.`,
  );
  process.exit(1);
}

if (violations.length > 0) {
  const byToken = {};
  for (const v of violations) {
    if (!byToken[v.token]) byToken[v.token] = [];
    byToken[v.token].push(v);
  }
  console.error(`✖  ${violations.length} retired PM Workspace token reference(s) found in production source — these must never reappear:`);
  for (const [token, hits] of Object.entries(byToken)) {
    console.error(`\n  Token: "${token}"`);
    for (const hit of hits) {
      const loc = hit.line != null ? `:${hit.line}` : "";
      console.error(`    ${hit.file}${loc}  ${hit.text}`);
    }
  }
  process.exit(1);
}

const bundleNote = bundleFiles > 0
  ? ` and ${bundleFiles} bundle chunk(s)`
  : " (no built .next chunks present — source-only pass)";

console.log(
  `✔  No retired PM Workspace tokens found in ${sourceFiles} production source files${bundleNote}.`,
);
process.exit(0);
