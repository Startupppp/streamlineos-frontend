import { act, renderHook } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { snapshotWorkbook, toFortuneSheets, type FortuneSheet } from "@/features/wiki/lib/kb-workbook-convert";
import type { KbWorkbookSheet } from "@/hooks/api/kb/kb-pages-schema";
import { useWorkbookAutosave } from "./use-workbook-autosave";

const mockPatch = jest.fn();
const mockPut = jest.fn();
jest.mock("@/hooks/api/kb", () => ({
  useUpdateKbWorkbook: () => ({ mutateAsync: mockPatch }),
  useReplaceKbWorkbook: () => ({ mutateAsync: mockPut }),
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

const SHEET = "11111111-1111-4111-8111-111111111111";

const backend: KbWorkbookSheet[] = [
  { id: SHEET, name: "Sheet1", position: 0, rowCount: 1, columnCount: 1, config: {}, cells: [{ r: 0, c: 0, t: "number", v: 1, m: "1" }] },
];

function liveSheets(value: number, id = SHEET): FortuneSheet[] {
  return [{ id, name: "Sheet1", order: 0, data: [[{ v: value, m: String(value) }]] }];
}

function setup() {
  const baseline = snapshotWorkbook(toFortuneSheets(backend));
  return renderHook(() => useWorkbookAutosave({ pageId: 7, contentRevision: 3, baseline }));
}

async function advance() {
  await act(async () => {
    jest.advanceTimersByTime(1600);
    await Promise.resolve();
  });
}

describe("useWorkbookAutosave", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPatch.mockReset();
    mockPut.mockReset();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("sends only the new change on the second save, against the revision the first save returned", async () => {
    mockPatch.mockResolvedValueOnce({ contentRevision: 4, updatedAt: "x" }).mockResolvedValueOnce({ contentRevision: 5, updatedAt: "y" });
    const { result } = setup();
    act(() => result.current.schedule(liveSheets(2)));
    await advance();
    act(() => result.current.schedule([{ id: SHEET, name: "Sheet1", order: 0, data: [[{ v: 2, m: "2" }, { v: 3, m: "3" }]] }]));
    await advance();
    expect(mockPatch).toHaveBeenCalledTimes(2);
    expect(mockPatch.mock.calls[0]?.[0]).toMatchObject({ pageId: 7, expectedContentRevision: 3 });
    expect(mockPatch.mock.calls[1]?.[0]).toMatchObject({
      expectedContentRevision: 4,
      operations: [{ op: "setCells", sheetId: SHEET, cells: [{ r: 0, c: 1, t: "number", v: 3, m: "3" }] }],
    });
    expect(result.current.saveState).toBe("saved");
  });

  it("sends nothing when the grid reports the state that is already saved", async () => {
    const { result } = setup();
    act(() => result.current.schedule(liveSheets(1)));
    await advance();
    expect(mockPatch).not.toHaveBeenCalled();
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("replaces the whole workbook when the change cannot be expressed as operations", async () => {
    mockPut.mockResolvedValueOnce({ contentRevision: 4, updatedAt: "x" });
    const { result } = setup();
    act(() => result.current.schedule(liveSheets(2, "not-a-uuid")));
    await advance();
    expect(mockPatch).not.toHaveBeenCalled();
    expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({ expectedContentRevision: 3, sheets: [expect.objectContaining({ name: "Sheet1" })] }));
  });

  it("stops saving and surfaces the conflict when the server reports a newer revision", async () => {
    mockPatch.mockRejectedValueOnce(
      new ApiError("stale", 409, "CONFLICT", { currentContentRevision: 9, lastEditedByName: "Ana", lastEditedAt: null }),
    );
    const { result } = setup();
    act(() => result.current.schedule(liveSheets(2)));
    await advance();
    expect(result.current.conflict).toEqual({ currentContentRevision: 9, lastEditedByName: "Ana", lastEditedAt: null });
    act(() => result.current.schedule(liveSheets(5)));
    await advance();
    expect(mockPatch).toHaveBeenCalledTimes(1);
  });

  it("overwrites with a full replace at the latest revision when the user keeps their version", async () => {
    mockPatch.mockRejectedValueOnce(new ApiError("stale", 409, "CONFLICT", { currentContentRevision: 9, lastEditedByName: null, lastEditedAt: null }));
    mockPut.mockResolvedValueOnce({ contentRevision: 10, updatedAt: "x" });
    const { result } = setup();
    act(() => result.current.schedule(liveSheets(2)));
    await advance();
    await act(async () => {
      await result.current.overwrite(9, liveSheets(2));
    });
    expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({ expectedContentRevision: 9 }));
    expect(result.current.conflict).toBeNull();
  });
});
