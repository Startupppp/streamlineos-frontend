import { renderHook, act } from "@testing-library/react";
import { useDashboardLayoutEditor } from "./use-dashboard-layout";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/hooks/api/build/dashboard-layout", () => ({
  useDashboardLayout: jest.fn(),
  useSaveDashboardLayout: jest.fn(),
}));

import { useDashboardLayout, useSaveDashboardLayout } from "@/hooks/api/build/dashboard-layout";
import type { DashboardLayoutGetLayoutResponse } from "@/contracts/build-contracts.generated";

const mockUseDashboardLayout = useDashboardLayout as jest.Mock;
const mockUseSaveDashboardLayout = useSaveDashboardLayout as jest.Mock;

const mockMutate = jest.fn();
const mockRefetch = jest.fn();

function setupHooks(
  serverLayout: DashboardLayoutGetLayoutResponse = { layoutVersion: 0, config: { widgets: [] }, updatedAt: "2026-01-01T00:00:00.000Z" },
) {
  mockUseDashboardLayout.mockReturnValue({ data: serverLayout, refetch: mockRefetch });
  mockUseSaveDashboardLayout.mockReturnValue({ mutate: mockMutate, isPending: false });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  setupHooks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useDashboardLayoutEditor — optimistic update", () => {
  it("updates local config immediately on reorder before the save round-trip completes so the UI does not lag", () => {
    setupHooks({
      layoutVersion: 1,
      config: {
        widgets: [
          { type: "my-issues", position: { col: 0, row: 0, w: 3, h: 4 } },
          { type: "projects", position: { col: 3, row: 0, w: 2, h: 4 } },
        ],
      },
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const { result } = renderHook(() => useDashboardLayoutEditor());
    act(() => {
      result.current.reorder(0, 1);
    });
    expect(result.current.config.widgets[0]?.type).toBe("projects");
    expect(result.current.config.widgets[1]?.type).toBe("my-issues");
  });

  it("removes the widget from local config immediately on removeWidget so the panel disappears without waiting for the server", () => {
    setupHooks({
      layoutVersion: 1,
      config: {
        widgets: [
          { type: "my-issues", position: { col: 0, row: 0, w: 3, h: 4 } },
          { type: "projects", position: { col: 3, row: 0, w: 2, h: 4 } },
        ],
      },
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const { result } = renderHook(() => useDashboardLayoutEditor());
    act(() => {
      result.current.removeWidget("my-issues");
    });
    expect(result.current.config.widgets).toHaveLength(1);
    expect(result.current.config.widgets[0]?.type).toBe("projects");
  });
});

describe("useDashboardLayoutEditor — reset to default", () => {
  it("replaces the config with the freelancer default when resetToDefault is called with freelancer", () => {
    const { result } = renderHook(() => useDashboardLayoutEditor());
    act(() => {
      result.current.resetToDefault("freelancer");
    });
    expect(result.current.config.widgets.every((w) => w.type === "my-issues")).toBe(true);
    expect(result.current.config.widgets.length).toBeGreaterThan(0);
  });

  it("replaces the config with the manager default which includes approvals so the persona gets their full panel set", () => {
    const { result } = renderHook(() => useDashboardLayoutEditor());
    act(() => {
      result.current.resetToDefault("manager");
    });
    const types = result.current.config.widgets.map((w) => w.type);
    expect(types).toContain("approvals");
    expect(types).toContain("my-issues");
  });
});

describe("useDashboardLayoutEditor — keyboard reorder", () => {
  it("moves a widget from position 2 to position 0 so keyboard-up-arrow reorder puts it at the top", () => {
    setupHooks({
      layoutVersion: 1,
      config: {
        widgets: [
          { type: "my-issues", position: { col: 0, row: 0, w: 1, h: 1 } },
          { type: "projects", position: { col: 1, row: 0, w: 1, h: 1 } },
          { type: "approvals", position: { col: 2, row: 0, w: 1, h: 1 } },
        ],
      },
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const { result } = renderHook(() => useDashboardLayoutEditor());
    act(() => {
      result.current.reorder(2, 0);
    });
    expect(result.current.config.widgets[0]?.type).toBe("approvals");
    expect(result.current.config.widgets[1]?.type).toBe("my-issues");
    expect(result.current.config.widgets[2]?.type).toBe("projects");
  });
});

describe("useDashboardLayoutEditor — debounced save", () => {
  it("does not call save immediately after a change so rapid edits are batched into one request", () => {
    setupHooks({ layoutVersion: 1, config: { widgets: [] }, updatedAt: "2026-01-01T00:00:00.000Z" });
    const { result } = renderHook(() => useDashboardLayoutEditor());
    act(() => {
      result.current.addWidget({ type: "blockers", position: { col: 0, row: 0, w: 1, h: 1 } });
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("calls save once after the debounce delay so the server gets at most one write per editing session", () => {
    setupHooks({ layoutVersion: 1, config: { widgets: [] }, updatedAt: "2026-01-01T00:00:00.000Z" });
    const { result } = renderHook(() => useDashboardLayoutEditor());
    act(() => {
      result.current.addWidget({ type: "blockers", position: { col: 0, row: 0, w: 1, h: 1 } });
    });
    act(() => {
      jest.runAllTimers();
    });
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });
});

describe("useDashboardLayoutEditor — 409 conflict handling", () => {
  it("calls refetch when the save mutation returns a 409 so the editor rehydrates with the server version", () => {
    const conflict409 = new ApiError("Conflict", 409, "VERSION_CONFLICT");
    mockMutate.mockImplementation((_vars: unknown, { onError }: { onError: (e: unknown) => void }) => {
      onError(conflict409);
    });
    setupHooks({ layoutVersion: 1, config: { widgets: [] }, updatedAt: "2026-01-01T00:00:00.000Z" });
    mockUseSaveDashboardLayout.mockReturnValue({ mutate: mockMutate, isPending: false });
    const { result } = renderHook(() => useDashboardLayoutEditor());
    act(() => {
      result.current.addWidget({ type: "blockers", position: { col: 0, row: 0, w: 1, h: 1 } });
    });
    act(() => {
      jest.runAllTimers();
    });
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("calls the onConflict callback when the save mutation returns a 409 so the caller can show a toast", () => {
    const conflict409 = new ApiError("Conflict", 409, "VERSION_CONFLICT");
    mockMutate.mockImplementation((_vars: unknown, { onError }: { onError: (e: unknown) => void }) => {
      onError(conflict409);
    });
    setupHooks({ layoutVersion: 1, config: { widgets: [] }, updatedAt: "2026-01-01T00:00:00.000Z" });
    mockUseSaveDashboardLayout.mockReturnValue({ mutate: mockMutate, isPending: false });
    const onConflict = jest.fn();
    const { result } = renderHook(() => useDashboardLayoutEditor(onConflict));
    act(() => {
      result.current.addWidget({ type: "blockers", position: { col: 0, row: 0, w: 1, h: 1 } });
    });
    act(() => {
      jest.runAllTimers();
    });
    expect(onConflict).toHaveBeenCalledTimes(1);
  });

  it("does not call refetch for a non-409 error so network errors do not trigger layout rehydration", () => {
    const networkError = new ApiError("Server error", 500, "INTERNAL_ERROR");
    mockMutate.mockImplementation((_vars: unknown, { onError }: { onError: (e: unknown) => void }) => {
      onError(networkError);
    });
    setupHooks({ layoutVersion: 1, config: { widgets: [] }, updatedAt: "2026-01-01T00:00:00.000Z" });
    mockUseSaveDashboardLayout.mockReturnValue({ mutate: mockMutate, isPending: false });
    const { result } = renderHook(() => useDashboardLayoutEditor());
    act(() => {
      result.current.addWidget({ type: "blockers", position: { col: 0, row: 0, w: 1, h: 1 } });
    });
    act(() => {
      jest.runAllTimers();
    });
    expect(mockRefetch).not.toHaveBeenCalled();
  });
});
