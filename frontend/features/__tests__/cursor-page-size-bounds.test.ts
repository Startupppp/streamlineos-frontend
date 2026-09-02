/**
 * `DataTable` slices a client-paginated table at its own default page size and,
 * since that slice became visible, shows its own pager whenever it bites. A
 * surface that already owns a cursor pager and hands the table MORE rows than
 * that default therefore grows a second pager: the reader pages inside a page,
 * and the two controls disagree about where they are.
 *
 * The invariant is that a cursor page never outgrows the table's window. It was
 * previously held by reading the ~20 page-size constants by hand; this executes
 * it instead, and follows the primitive rather than hard-coding 50.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";

const REPO_ROOT = join(__dirname, "..", "..");
const SCAN_ROOTS = ["features", "components", "app"];
const EXCLUDED_DIRS = new Set(["node_modules", ".next", ".git", "feedbucket-widget"]);

const CURSOR_PAGER = /\b(CursorPageControls|fetchNextPage|hasNextPage|nextCursor)\b/;
const NUMERIC_CONST = /const\s+([A-Za-z_$][\w$]*)\s*=\s*(\d+)\s*;/g;
const NAMED_PAGE_SIZE = /\b(?:limit|pageSize):\s*([A-Za-z_$][\w$]*)/g;
const EXPLICIT_TABLE_PAGE_SIZE = /pagination=\{\{\s*pageSize:\s*(\d+)/;

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (
      [".ts", ".tsx"].includes(extname(entry.name)) &&
      !entry.name.includes(".test.") &&
      !entry.name.endsWith(".d.ts")
    )
      yield full;
  }
}

function readDataTableDefaultPageSize(): number {
  const source = readFileSync(join(REPO_ROOT, "components/ui/data-table.tsx"), "utf8");
  const match = source.match(/clientPag\?\.pageSize\s*\?\?\s*(\d+)/);
  if (!match?.[1]) throw new Error("DataTable's default client page size could not be read");
  return Number(match[1]);
}

interface Offence {
  file: string;
  constant: string;
  cursorPageSize: number;
  tableWindow: number;
}

function findOffences(
  files: { file: string; source: string }[],
  defaultPageSize: number,
): Offence[] {
  const offences: Offence[] = [];
  for (const { file, source } of files) {
    if (!source.includes("<DataTable")) continue;
    if (!CURSOR_PAGER.test(source)) continue;

    const constants = new Map<string, number>();
    NUMERIC_CONST.lastIndex = 0;
    let declared: RegExpExecArray | null;
    while ((declared = NUMERIC_CONST.exec(source)) !== null)
      if (declared[1] && declared[2]) constants.set(declared[1], Number(declared[2]));

    const explicit = source.match(EXPLICIT_TABLE_PAGE_SIZE);
    const tableWindow = explicit?.[1] ? Number(explicit[1]) : defaultPageSize;

    NAMED_PAGE_SIZE.lastIndex = 0;
    let used: RegExpExecArray | null;
    while ((used = NAMED_PAGE_SIZE.exec(source)) !== null) {
      const name = used[1];
      if (!name) continue;
      const size = constants.get(name);
      if (size === undefined) continue;
      if (size > tableWindow)
        offences.push({ file, constant: name, cursorPageSize: size, tableWindow });
    }
  }
  return offences;
}

const scannedFiles = SCAN_ROOTS.flatMap((root) =>
  [...walk(join(REPO_ROOT, root))].map((file) => ({
    file: file.slice(REPO_ROOT.length + 1),
    source: readFileSync(file, "utf8"),
  })),
);

describe("a cursor page never outgrows the DataTable window", () => {
  const defaultPageSize = readDataTableDefaultPageSize();

  it("reads the table's own default rather than assuming one", () => {
    expect(defaultPageSize).toBeGreaterThan(0);
    expect(defaultPageSize).toBe(50);
  });

  it("scans a real population of cursor-paginated tables", () => {
    const cursorTables = scannedFiles.filter(
      ({ source }) => source.includes("<DataTable") && CURSOR_PAGER.test(source),
    );
    expect(cursorTables.length).toBeGreaterThan(30);
  });

  it("finds no surface handing its table more rows than the table will show", () => {
    const offences = findOffences(scannedFiles, defaultPageSize);
    expect(
      offences.map(
        (o) =>
          `${o.file}: ${o.constant}=${o.cursorPageSize} exceeds the ${o.tableWindow}-row table window`,
      ),
    ).toEqual([]);
  });

  it("detects a surface that pages above the window (negative control)", () => {
    const offences = findOffences(
      [
        {
          file: "synthetic/over-paged-page.tsx",
          source: [
            "const PAGE_SIZE = 80;",
            "const q = useThings({ limit: PAGE_SIZE, cursor });",
            "const hasNextPage = Boolean(q.data?.nextCursor);",
            "<DataTable data={q.data.items} columns={cols} />",
            "<CursorPageControls hasNext={hasNextPage} />",
          ].join("\n"),
        },
      ],
      defaultPageSize,
    );
    expect(offences).toEqual([
      {
        file: "synthetic/over-paged-page.tsx",
        constant: "PAGE_SIZE",
        cursorPageSize: 80,
        tableWindow: 50,
      },
    ]);
  });

  it("accepts the same surface once its table is told to show the whole page", () => {
    const offences = findOffences(
      [
        {
          file: "synthetic/over-paged-page.tsx",
          source: [
            "const PAGE_SIZE = 80;",
            "const q = useThings({ limit: PAGE_SIZE, cursor });",
            "const hasNextPage = Boolean(q.data?.nextCursor);",
            "<DataTable data={q.data.items} columns={cols} pagination={{ pageSize: 80 }} />",
            "<CursorPageControls hasNext={hasNextPage} />",
          ].join("\n"),
        },
      ],
      defaultPageSize,
    );
    expect(offences).toEqual([]);
  });
});
