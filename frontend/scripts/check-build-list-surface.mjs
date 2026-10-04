import { mkdirSync, mkdtempSync, readdirSync, readFileSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isExcludedScanDir } from "./check-repo-paths.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BUILD_FEATURES_DIR = join(ROOT, "features", "build");
const ALLOWLIST_PATH = fileURLToPath(new URL("check-build-list-surface-allowlist.json", import.meta.url));

const MIN_BUILD_FILES = 100;

const HAS_DATA_TABLE = /<DataTable\b/;
const HAS_PAGE_STATE = /usePageState\s*\(|<PageState\b/;

function* walkBuildTsx(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (isExcludedScanDir(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkBuildTsx(full);
    } else if (
      entry.name.endsWith(".tsx") &&
      !entry.name.endsWith(".test.tsx") &&
      !entry.name.endsWith(".spec.tsx") &&
      !entry.name.endsWith(".test-harness.tsx")
    ) {
      yield full;
    }
  }
}

export function scan(buildRoot, frontendRoot) {
  const violations = [];
  let scannedFiles = 0;

  for (const file of walkBuildTsx(buildRoot)) {
    scannedFiles++;
    const source = readFileSync(file, "utf8");
    if (HAS_DATA_TABLE.test(source) && HAS_PAGE_STATE.test(source)) {
      violations.push(relative(frontendRoot, file).replace(/\\/g, "/"));
    }
  }

  return { violations, scannedFiles };
}

function loadAllowlist() {
  try {
    const raw = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
    return Array.isArray(raw) ? raw : null;
  } catch {
    return null;
  }
}

function runSelfTest() {
  let passed = 0;
  const failures = [];
  const assert = (label, condition) => {
    if (condition) passed++;
    else failures.push(label);
  };

  const fixture = mkdtempSync(join(tmpdir(), "check-build-list-surface-"));
  try {
    const buildDir = join(fixture, "features", "build", "tickets");
    const membersDir = join(fixture, "features", "build", "members");
    mkdirSync(buildDir, { recursive: true });
    mkdirSync(membersDir, { recursive: true });

    writeFileSync(
      join(buildDir, "hand-assembled-page.tsx"),
      [
        '"use client";',
        'import { DataTable } from "@/components/ui/data-table";',
        'import { usePageState } from "@/hooks/api/use-page-state";',
        'export function HandAssembledPage() {',
        '  const ps = usePageState({ permission: "build:view", isLoading: false, isError: false, error: undefined });',
        '  return <DataTable data={[]} columns={[]} getRowKey={(r) => r.id} />;',
        '}',
      ].join("\n"),
    );

    writeFileSync(
      join(buildDir, "hand-assembled-page-state.tsx"),
      [
        '"use client";',
        'import { DataTable } from "@/components/ui/data-table";',
        'import { PageState } from "@/components/shared/page-state";',
        'export function HandAssembledPageState({ resolution }) {',
        '  return (',
        '    <PageState resolution={resolution} loading={null} onRetry={() => undefined}>',
        '      <DataTable data={[]} columns={[]} getRowKey={(r) => r.id} />',
        '    </PageState>',
        '  );',
        '}',
      ].join("\n"),
    );

    writeFileSync(
      join(buildDir, "surface-page.tsx"),
      [
        '"use client";',
        'import { BuildListSurface } from "@/features/build/shared/build-list-surface";',
        'export function SurfacePage() {',
        '  return <BuildListSurface permission="build:view" rows={[]} columns={[]} isLoading={false} isError={false} empty={null} getRowKey={(r) => r.id} />;',
        '}',
      ].join("\n"),
    );

    writeFileSync(
      join(buildDir, "skeleton-only.tsx"),
      [
        '"use client";',
        'import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";',
        'import { usePageState } from "@/hooks/api/use-page-state";',
        'export function SkeletonPage() {',
        '  const ps = usePageState({ permission: "build:view", isLoading: false, isError: false, error: undefined });',
        '  return <DataTableSkeleton rows={8} headers={["Name"]} />;',
        '}',
      ].join("\n"),
    );

    writeFileSync(
      join(buildDir, "column-type-only.tsx"),
      [
        '"use client";',
        'import { useMemo } from "react";',
        'import type { DataTableColumn } from "@/components/ui/data-table";',
        'import { usePageState } from "@/hooks/api/use-page-state";',
        'export function ColumnTypeOnly() {',
        '  const ps = usePageState({ permission: "build:view", isLoading: false, isError: false, error: undefined });',
        '  const columns = useMemo<DataTableColumn<{ id: number }>[]>(() => [], []);',
        '  return null;',
        '}',
      ].join("\n"),
    );

    writeFileSync(
      join(buildDir, "table-only.tsx"),
      [
        '"use client";',
        'import { DataTable } from "@/components/ui/data-table";',
        'export function TableOnly() {',
        '  return <DataTable data={[]} columns={[]} getRowKey={(r) => r.id} />;',
        '}',
      ].join("\n"),
    );

    writeFileSync(
      join(membersDir, "members-page.test.tsx"),
      [
        'import { DataTable } from "@/components/ui/data-table";',
        'import { usePageState } from "@/hooks/api/use-page-state";',
        'it("test", () => {});',
      ].join("\n"),
    );

    const buildRoot = join(fixture, "features", "build");
    const { violations, scannedFiles } = scan(buildRoot, fixture);
    const joined = violations.join("\n");
    const flag = (name) => joined.includes(name);

    assert("BITE: DataTable + usePageState is a hand-assembled page", flag("hand-assembled-page.tsx"));
    assert("BITE: DataTable + <PageState is a hand-assembled page", flag("hand-assembled-page-state.tsx"));
    assert("BuildListSurface pages are accepted", !flag("surface-page.tsx"));
    assert("DataTableSkeleton + usePageState is not a violation", !flag("skeleton-only.tsx"));
    assert("DataTable without page state is not a violation", !flag("table-only.tsx"));
    assert("a DataTableColumn type argument is not a rendered DataTable", !flag("column-type-only.tsx"));
    assert("test files (.test.tsx) are excluded from the scan", !flag("members-page.test.tsx"));
    assert("exactly two violations are reported in the fixture", violations.length === 2);
    assert("the fixture is actually scanned (non-zero file count)", scannedFiles > 0);
    assert("the vacuity floor would not block a small fixture", scannedFiles < MIN_BUILD_FILES);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    for (const f of failures) console.error(`✖  self-test FAILED: ${f}`);
    console.error(`check-build-list-surface self-tests: ${failures.length} failed, ${passed} passed`);
    process.exit(1);
  }
  console.log(`check-build-list-surface self-tests: ${passed} passed`);
  process.exit(0);
}

function runMain() {
  const allowlist = loadAllowlist();

  if (!allowlist) {
    console.error("✖  check-build-list-surface-allowlist.json is missing or unreadable. The gate cannot run without its exemption list.");
    process.exit(1);
  }

  for (const entry of allowlist) {
    const full = join(ROOT, entry.path);
    if (!existsSync(full)) {
      console.error(`✖  Allowlist entry "${entry.path}" no longer exists on disk.`);
      console.error("   An exemption that outlives its subject silently licenses the next violating page.");
      process.exit(1);
    }
  }

  const { violations, scannedFiles } = scan(BUILD_FEATURES_DIR, ROOT);

  if (scannedFiles < MIN_BUILD_FILES) {
    console.error(`✖  Only ${scannedFiles} file(s) scanned under features/build/ — the walk is broken, so a clean result would prove nothing.`);
    process.exit(1);
  }

  const allowedPaths = new Set(allowlist.map((e) => e.path));
  const realViolations = violations.filter((v) => !allowedPaths.has(v));

  const summary = `${scannedFiles} non-test .tsx files scanned under features/build/, ${allowlist.length} known exemptions`;

  if (realViolations.length === 0) {
    console.log(`✔  No hand-assembled Build list page (${summary}).`);
    console.log("");
    console.log("  SCAN DEFINITION: a non-test .tsx file under features/build/ that renders <DataTable");
    console.log("  directly (not DataTableSkeleton) AND calls usePageState() or renders <PageState.");
    console.log("");
    console.log("  CANNOT SEE: a page that reaches DataTable through an intermediate component — for");
    console.log("  example a TransitionsTable or ProjectMemberRolesSection sub-component. A page");
    console.log("  that wraps DataTable in its own component without importing it directly also");
    console.log("  passes this gate. A runtime-composed surface is invisible for the same reason.");
    process.exit(0);
  }

  console.error(`✖  ${realViolations.length} Build list page(s) hand-assemble their own surface (${summary}).`);
  console.error("   Use <BuildListSurface> instead — it provides the correct branch order:");
  console.error("   access-loading -> module unavailable -> denied -> loading -> error -> empty -> ready.");
  console.error("   Pages legitimately outside the pattern are enumerated in");
  console.error("   scripts/check-build-list-surface-allowlist.json (may only shrink).");
  for (const v of realViolations) console.error(`  ${v}`);
  process.exit(1);
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  if (process.argv.includes("--self-test")) runSelfTest();
  else runMain();
}
