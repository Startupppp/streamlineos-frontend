import { diffWorkbook, snapshotWorkbook, toFortuneSheets, toSheetInputs } from "./kb-workbook-convert";
import type { KbWorkbookSheet } from "@/hooks/api/kb/kb-pages-schema";

const SHEET_A = "11111111-1111-4111-8111-111111111111";
const SHEET_B = "22222222-2222-4222-8222-222222222222";

function backendSheet(overrides: Partial<KbWorkbookSheet> = {}): KbWorkbookSheet {
  return {
    id: SHEET_A,
    name: "Sheet1",
    position: 0,
    rowCount: 2,
    columnCount: 1,
    config: {},
    cells: [
      { r: 0, c: 0, t: "string", v: "Name", m: "Name", s: { bl: 1 } },
      { r: 1, c: 0, t: "number", v: 42, m: "42" },
    ],
    ...overrides,
  };
}

function baselineOf(sheets: KbWorkbookSheet[]) {
  return snapshotWorkbook(toFortuneSheets(sheets));
}

describe("kb workbook conversion", () => {
  it("round-trips backend sheets to an identical snapshot so opening a file sends nothing", () => {
    const baseline = baselineOf([backendSheet()]);
    expect(baseline[0]?.cells).toEqual(backendSheet().cells);
    expect(diffWorkbook(baseline, baselineOf([backendSheet()]))).toEqual([]);
  });

  it("reads edits from the live data matrix, which replaces celldata after the grid mounts", () => {
    const baseline = baselineOf([backendSheet()]);
    const [live] = toFortuneSheets([backendSheet()]);
    if (!live) throw new Error("missing sheet");
    const edited = {
      ...live,
      celldata: undefined,
      data: [[{ v: "Name", m: "Name", bl: 1 }], [{ v: 43, m: "43" }]],
    };
    expect(diffWorkbook(baseline, snapshotWorkbook([edited]))).toEqual([
      { op: "setCells", sheetId: SHEET_A, cells: [{ r: 1, c: 0, t: "number", v: 43, m: "43" }] },
    ]);
  });

  it("clears a cell whose value was deleted", () => {
    const baseline = baselineOf([backendSheet()]);
    const next = baselineOf([backendSheet({ cells: [{ r: 0, c: 0, t: "string", v: "Name", m: "Name", s: { bl: 1 } }] })]);
    expect(diffWorkbook(baseline, next)).toEqual([{ op: "clearCells", sheetId: SHEET_A, cells: [{ r: 1, c: 0 }] }]);
  });

  it("orders sheet deletes before adds so a re-created sheet name does not collide", () => {
    const baseline = baselineOf([backendSheet(), backendSheet({ id: SHEET_B, name: "Old", position: 1, cells: [] })]);
    const third = "33333333-3333-4333-8333-333333333333";
    const next = baselineOf([backendSheet(), backendSheet({ id: third, name: "Old", position: 1, cells: [] })]);
    expect(diffWorkbook(baseline, next)).toEqual([
      { op: "deleteSheet", sheetId: SHEET_B },
      { op: "addSheet", sheetId: third, name: "Old", position: 1 },
    ]);
  });

  it("falls back to a full replace for a sheet id the server cannot accept", () => {
    const baseline = baselineOf([backendSheet()]);
    const next = baselineOf([backendSheet(), backendSheet({ id: "sheet-2", name: "Two", position: 1 })]);
    expect(diffWorkbook(baseline, next)).toBeNull();
  });

  it("falls back to a full replace when two sheets swap names", () => {
    const baseline = baselineOf([backendSheet(), backendSheet({ id: SHEET_B, name: "Sheet2", position: 1 })]);
    const next = baselineOf([
      backendSheet({ name: "Sheet2" }),
      backendSheet({ id: SHEET_B, name: "Sheet1", position: 1 }),
    ]);
    expect(diffWorkbook(baseline, next)).toBeNull();
  });

  it("falls back to a full replace when one save would exceed the request cell cap", () => {
    const baseline = baselineOf([backendSheet({ cells: [] })]);
    const cells = Array.from({ length: 50_001 }, (_, i) => ({ r: i % 10_000, c: Math.floor(i / 10_000), t: "number" as const, v: i }));
    expect(diffWorkbook(baseline, baselineOf([backendSheet({ cells })]))).toBeNull();
  });

  it("keeps sheet ids in replace inputs so later saves can still diff against them", () => {
    expect(toSheetInputs(baselineOf([backendSheet()]))[0]?.id).toBe(SHEET_A);
    expect(toSheetInputs([{ ...backendSheet(), id: "sheet-2" }])[0]).not.toHaveProperty("id");
  });
});
