import { renderHook, act } from "@testing-library/react";
import { useWhiteboardAutosave } from "./use-whiteboard-autosave";

let mockVersion = 1;
const mockGetSceneVersion = jest.fn(() => mockVersion);
const mockSerializeAsJSON = jest.fn(() => '{"elements":[],"appState":{},"files":{}}');

jest.mock("@excalidraw/excalidraw", () => ({
  serializeAsJSON: (...args: unknown[]) => mockSerializeAsJSON(...args),
  getSceneVersion: (...args: unknown[]) => mockGetSceneVersion(...args),
}));

const ELEMENTS = [{ id: "el-1" }] as never;
const ELEMENTS2 = [{ id: "el-2" }] as never;
const APP_STATE = {} as never;
const FILES = {} as never;

describe("BUG-051 — autosave marks saved after API returns even when Excalidraw fires onChange continuously during save", () => {
  let saveAsync: jest.Mock;
  let resolve: (v: unknown) => void;

  beforeEach(() => {
    mockVersion = 1;
    mockGetSceneVersion.mockClear();
    mockSerializeAsJSON.mockClear();
    resolve = () => {};
    saveAsync = jest.fn(() => new Promise((r) => { resolve = r; }));
  });

  it("status transitions to saved after the API resolves when scene version is unchanged", async () => {
    const { result } = renderHook(() =>
      useWhiteboardAutosave({
        boardId: 1,
        access: "edit",
        initialVersion: 0,
        saveAsync,
      }),
    );

    act(() => { result.current.handleSceneChange(ELEMENTS, APP_STATE, FILES); });
    expect(result.current.status).toBe("dirty");

    act(() => { result.current.manualSave(); });
    await act(async () => { resolve(undefined); });

    expect(result.current.status).toBe("saved");
  });

  it("status stays dirty when the scene version advances during the in-flight save so the next autosave fires", async () => {
    const { result } = renderHook(() =>
      useWhiteboardAutosave({
        boardId: 1,
        access: "edit",
        initialVersion: 0,
        saveAsync,
      }),
    );

    act(() => { result.current.handleSceneChange(ELEMENTS, APP_STATE, FILES); });
    act(() => { result.current.manualSave(); });

    mockVersion = 2;
    act(() => { result.current.handleSceneChange(ELEMENTS2, APP_STATE, FILES); });

    await act(async () => { resolve(undefined); });

    expect(result.current.status).toBe("dirty");
  });

  it("scene-change at the already-saved version is a no-op because lastSavedVersion was updated", async () => {
    const { result } = renderHook(() =>
      useWhiteboardAutosave({
        boardId: 1,
        access: "edit",
        initialVersion: 0,
        saveAsync,
      }),
    );

    act(() => { result.current.handleSceneChange(ELEMENTS, APP_STATE, FILES); });
    act(() => { result.current.manualSave(); });
    await act(async () => { resolve(undefined); });

    expect(result.current.status).toBe("saved");
    const callsBefore = saveAsync.mock.calls.length;

    saveAsync.mockImplementation(() => new Promise((r) => { resolve = r; }));

    act(() => { result.current.handleSceneChange(ELEMENTS, APP_STATE, FILES); });
    act(() => { result.current.manualSave(); });

    expect(saveAsync.mock.calls.length).toBe(callsBefore);
  });
});
