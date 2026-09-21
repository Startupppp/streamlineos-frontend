import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { DataTableSkeleton } from "./data-table-skeleton";

jest.mock("@/hooks/common/use-online-status", () => ({ useOnlineStatus: () => true }));

describe("a table skeleton shows the real column headers before the rows arrive", () => {
  it("renders the named headers and no numbered placeholders", () => {
    render(<DataTableSkeleton rows={3} headers={["Employee", "Status", "Opened"]} />);
    for (const name of ["Employee", "Status", "Opened"])
      expect(screen.getByRole("columnheader", { name })).toBeInTheDocument();
    expect(screen.queryByText(/Column \d/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(4);
  });

  it("falls back to numbered screen-reader labels when only a count is known", () => {
    render(<DataTableSkeleton rows={2} columns={2} />);
    expect(screen.getByRole("columnheader", { name: "Column 1" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Column 2" })).toBeInTheDocument();
  });
});

const ROOT = path.resolve(__dirname, "..", "..");
const HRMS_LOADING_ROOTS = [
  "app/(authenticated)/hr",
  "app/(authenticated)/payroll",
  "app/(authenticated)/timesheets",
  "app/(authenticated)/me",
] as const;
const HRMS_FEATURE_ROOTS = ["features/hr", "features/payroll", "features/timesheets", "features/me"] as const;

function sourceFilesUnder(roots: readonly string[], keep: (relative: string) => boolean): string[] {
  const found: string[] = [];
  for (const root of roots)
    for (const entry of readdirSync(path.join(ROOT, root), { recursive: true })) {
      const relative = path.join(root, String(entry)).split(path.sep).join("/");
      if (keep(relative)) found.push(relative);
    }
  return found.sort();
}

const SKELETON_WITH_BARE_COUNT = /<DataTableSkeleton\b[^>]*\bcolumns=/g;

describe("HRMS, payroll, timesheets and /me skeletons name their columns", () => {
  const loadingFiles = sourceFilesUnder(HRMS_LOADING_ROOTS, (file) => file.endsWith("/loading.tsx"));
  const featureFiles = sourceFilesUnder(
    HRMS_FEATURE_ROOTS,
    (file) => file.endsWith(".tsx") && !file.includes(".test.") && !file.includes("__tests__"),
  );

  it("scans a non-trivial corpus, so an empty result means clean and not unscanned", () => {
    expect(loadingFiles.length).toBeGreaterThan(100);
    expect(
      loadingFiles.filter((file) => readFileSync(path.join(ROOT, file), "utf8").includes("<DataTableSkeleton")).length,
    ).toBeGreaterThan(25);
    expect(featureFiles.length).toBeGreaterThan(500);
  });

  it("has no route loading boundary or feature loading branch passing a bare column count", () => {
    const offenders: string[] = [];
    for (const file of [...loadingFiles, ...featureFiles]) {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      for (const match of source.matchAll(SKELETON_WITH_BARE_COUNT)) {
        const line = source.slice(0, match.index).split("\n").length;
        offenders.push(`${file}:${String(line)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the page title mounted around every table skeleton", () => {
    const untitled = loadingFiles.filter((file) => {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      return source.includes("<DataTableSkeleton") && !/<PageWrapper\b[^>]*\btitle=/s.test(source);
    });
    expect(untitled).toEqual([]);
  });
});
