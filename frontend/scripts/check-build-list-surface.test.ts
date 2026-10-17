import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scan } from "./check-build-list-surface.mjs";

function makeTmpBuildDir() {
  const root = mkdtempSync(join(tmpdir(), "build-surface-gate-"));
  const buildDir = join(root, "features", "build", "tickets");
  mkdirSync(buildDir, { recursive: true });
  return { root, buildDir };
}

describe("scan — hand-assembled Build list page detection", () => {
  it("flags a file that renders <DataTable and calls usePageState", () => {
    const { root, buildDir } = makeTmpBuildDir();
    try {
      writeFileSync(
        join(buildDir, "old-page.tsx"),
        [
          '"use client";',
          'import { DataTable } from "@/components/ui/data-table";',
          'import { usePageState } from "@/hooks/api/use-page-state";',
          'export function OldPage() {',
          '  const ps = usePageState({ permission: "build:view", isLoading: false, isError: false, error: undefined });',
          '  return <DataTable data={[]} columns={[]} getRowKey={(r) => r.id} />;',
          '}',
        ].join("\n"),
      );

      const { violations } = scan(join(root, "features", "build"), root);
      expect(violations.some((v) => v.includes("old-page.tsx"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a file that renders <DataTable inside a <PageState", () => {
    const { root, buildDir } = makeTmpBuildDir();
    try {
      writeFileSync(
        join(buildDir, "page-state-page.tsx"),
        [
          '"use client";',
          'import { DataTable } from "@/components/ui/data-table";',
          'import { PageState } from "@/components/shared/page-state";',
          'export function PageStatePage({ resolution }) {',
          '  return (',
          '    <PageState resolution={resolution} loading={null} onRetry={() => undefined}>',
          '      <DataTable data={[]} columns={[]} getRowKey={(r) => r.id} />',
          '    </PageState>',
          '  );',
          '}',
        ].join("\n"),
      );

      const { violations } = scan(join(root, "features", "build"), root);
      expect(violations.some((v) => v.includes("page-state-page.tsx"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not flag a file that uses BuildListSurface", () => {
    const { root, buildDir } = makeTmpBuildDir();
    try {
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

      const { violations } = scan(join(root, "features", "build"), root);
      expect(violations.some((v) => v.includes("surface-page.tsx"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not flag DataTableSkeleton used inside PageState (compliant loading slot)", () => {
    const { root, buildDir } = makeTmpBuildDir();
    try {
      writeFileSync(
        join(buildDir, "skeleton-in-loading.tsx"),
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

      const { violations } = scan(join(root, "features", "build"), root);
      expect(violations.some((v) => v.includes("skeleton-in-loading.tsx"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not flag a column-definition file that uses DataTable type but no page state", () => {
    const { root, buildDir } = makeTmpBuildDir();
    try {
      writeFileSync(
        join(buildDir, "table-columns.tsx"),
        [
          'import type { DataTableColumn } from "@/components/ui/data-table";',
          'import { DataTable } from "@/components/ui/data-table";',
          'export function TableColumns() {',
          '  return <DataTable data={[]} columns={[]} getRowKey={(r) => r.id} />;',
          '}',
        ].join("\n"),
      );

      const { violations } = scan(join(root, "features", "build"), root);
      expect(violations.some((v) => v.includes("table-columns.tsx"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("excludes .test.tsx files from the scan", () => {
    const { root, buildDir } = makeTmpBuildDir();
    try {
      writeFileSync(
        join(buildDir, "my-page.test.tsx"),
        [
          'import { DataTable } from "@/components/ui/data-table";',
          'import { usePageState } from "@/hooks/api/use-page-state";',
          'it("renders", () => {});',
        ].join("\n"),
      );

      const { violations } = scan(join(root, "features", "build"), root);
      expect(violations.some((v) => v.includes("my-page.test.tsx"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("excludes .test-harness.tsx files from the scan", () => {
    const { root, buildDir } = makeTmpBuildDir();
    try {
      writeFileSync(
        join(buildDir, "scope-pages.test-harness.tsx"),
        [
          'import { DataTable } from "@/components/ui/data-table";',
          'import { PageState } from "@/components/shared/page-state";',
          'export function Harness({ resolution }) {',
          '  return <PageState resolution={resolution} loading={null} onRetry={() => undefined}><DataTable data={[]} columns={[]} getRowKey={(r) => r.id} /></PageState>;',
          '}',
        ].join("\n"),
      );

      const { violations } = scan(join(root, "features", "build"), root);
      expect(violations.some((v) => v.includes("scope-pages.test-harness.tsx"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports file paths relative to the frontend root, with forward slashes", () => {
    const { root, buildDir } = makeTmpBuildDir();
    try {
      writeFileSync(
        join(buildDir, "old-style.tsx"),
        [
          '"use client";',
          'import { DataTable } from "@/components/ui/data-table";',
          'import { usePageState } from "@/hooks/api/use-page-state";',
          'export function OldStyle() {',
          '  const ps = usePageState({ permission: "build:view", isLoading: false, isError: false, error: undefined });',
          '  return <DataTable data={[]} columns={[]} getRowKey={(r) => r.id} />;',
          '}',
        ].join("\n"),
      );

      const { violations } = scan(join(root, "features", "build"), root);
      const match = violations.find((v) => v.includes("old-style.tsx"));
      expect(match).toBeDefined();
      expect(match).not.toContain("\\");
      expect(match).toMatch(/^features\/build\//);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns a non-zero scannedFiles count for a non-empty build directory", () => {
    const { root, buildDir } = makeTmpBuildDir();
    try {
      writeFileSync(
        join(buildDir, "any-page.tsx"),
        '"use client";\nexport function AnyPage() { return null; }',
      );

      const { scannedFiles } = scan(join(root, "features", "build"), root);
      expect(scannedFiles).toBeGreaterThan(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
