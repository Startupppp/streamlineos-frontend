import { act, renderHook } from "@testing-library/react";
import { toast } from "sonner";
import { useAccess, useCan } from "@/hooks/api/access";
import { useDashboardLayout, useSaveDashboardLayout } from "@/hooks/api/build/dashboard-layout";
import { ApiError } from "@/lib/api-envelope";
import { useDashboardLayoutEditor } from "./use-dashboard-layout";
import type { WidgetSlot } from "./dashboard-layout";

jest.mock("@/hooks/api/access", () => ({ useAccess: jest.fn(), useCan: jest.fn() }));
jest.mock("@/hooks/api/build/dashboard-layout", () => ({
  useDashboardLayout: jest.fn(),
  useSaveDashboardLayout: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

const mockSave = jest.fn();
const ALL_SCOPES = {
  "build:tickets:view": "all",
  "build:approvals:view": "all",
  "build:risks:view": "all",
};

function stored(widgets: WidgetSlot[], layoutVersion = 2) {
  return { layoutVersion, config: { widgets }, updatedAt: "2026-10-06T00:00:00Z" };
}

function setup({
  data = stored([]),
  loaded = true,
  scopes = ALL_SCOPES,
  canManage = true,
  isSaving = false,
}: {
  data?: ReturnType<typeof stored>;
  loaded?: boolean;
  scopes?: Record<string, string>;
  canManage?: boolean;
  isSaving?: boolean;
} = {}) {
  jest.mocked(useAccess).mockReturnValue({ data: { isOrgOwner: false, scopes, modules: {} } } as never);
  jest.mocked(useCan).mockImplementation((key) => key !== "build:dashboard:manage" || canManage);
  jest.mocked(useDashboardLayout).mockReturnValue({ data: loaded ? data : undefined, isLoading: false } as never);
  jest.mocked(useSaveDashboardLayout).mockReturnValue({ mutate: mockSave, isPending: isSaving } as never);
  return renderHook(() => useDashboardLayoutEditor());
}

beforeEach(() => {
  mockSave.mockReset();
  jest.mocked(toast.error).mockReset();
});

describe("useDashboardLayoutEditor — which widgets render", () => {
  it("falls back to the default arrangement when the member has never saved a layout", () => {
    const { result } = setup({ data: stored([], 0) });
    expect(result.current.widgets.map((slot) => slot.type)).toEqual([
      "overview",
      "my-issues",
      "projects",
      "approvals",
      "agent-runs",
      "releases",
      "risks",
      "blockers",
    ]);
  });

  it("keeps an intentionally emptied layout empty instead of restoring the defaults", () => {
    const { result } = setup({ data: stored([], 4) });
    expect(result.current.widgets).toEqual([]);
  });

  it("drops widgets the member cannot view and lists only permitted widgets in the picker", () => {
    const { result } = setup({ data: stored([], 0), scopes: { "build:tickets:view": "all" } });
    const types = result.current.widgets.map((slot) => slot.type);
    expect(types).not.toContain("approvals");
    expect(types).not.toContain("agent-runs");
    expect(types).not.toContain("risks");
    expect(types).toContain("my-issues");
    expect(result.current.availableTypes).not.toContain("risks");
  });

  it("renders a duplicated widget once so a hand-edited layout cannot mount a panel twice", () => {
    const { result } = setup({
      data: stored([
        { type: "projects", position: { col: 0, row: 0, w: 6, h: 5 } },
        { type: "projects", position: { col: 6, row: 0, w: 6, h: 5 } },
      ]),
    });
    expect(result.current.widgets).toHaveLength(1);
  });

  it("only offers customization once the saved layout has loaded and the member can manage it", () => {
    expect(setup({ loaded: false }).result.current.canCustomize).toBe(false);
    expect(setup({ canManage: false }).result.current.canCustomize).toBe(false);
    expect(setup().result.current.canCustomize).toBe(true);
  });
});

describe("useDashboardLayoutEditor — drafts before saving", () => {
  const twoWidgets: WidgetSlot[] = [
    { type: "my-issues", position: { col: 0, row: 0, w: 6, h: 6 } },
    { type: "projects", position: { col: 6, row: 0, w: 6, h: 6 } },
  ];

  it("adds a widget below the existing ones at its catalog size", () => {
    const { result } = setup({ data: stored(twoWidgets) });
    act(() => result.current.addWidget("risks"));
    expect(result.current.widgets.find((slot) => slot.type === "risks")?.position).toEqual({ col: 0, row: 6, w: 6, h: 5 });
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("removes a widget from the draft without issuing a request", () => {
    const { result } = setup({ data: stored(twoWidgets) });
    act(() => result.current.removeWidget("projects"));
    expect(result.current.widgets.map((slot) => slot.type)).toEqual(["my-issues"]);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("keeps hidden widgets when Done commits the draft", () => {
    const { result } = setup({
      data: stored([...twoWidgets, { type: "risks", position: { col: 0, row: 6, w: 6, h: 5 } }]),
      scopes: { "build:tickets:view": "all" },
    });
    act(() => result.current.removeWidget("projects"));
    act(() => result.current.saveLayout());
    expect(mockSave.mock.calls[0]?.[0].config.widgets.map((slot: WidgetSlot) => slot.type)).toEqual(["my-issues", "risks"]);
  });

  it("does not save when a drag ends where it started", () => {
    const { result } = setup({ data: stored(twoWidgets) });
    act(() =>
      result.current.applyLayout([
        { i: "my-issues", x: 0, y: 0, w: 6, h: 6 },
        { i: "projects", x: 6, y: 0, w: 6, h: 6 },
      ]),
    );
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("keeps a dropped position in the draft until Done saves it once", () => {
    const { result } = setup({ data: stored(twoWidgets) });
    act(() =>
      result.current.applyLayout([
        { i: "my-issues", x: 6, y: 0, w: 6, h: 6 },
        { i: "projects", x: 0, y: 0, w: 6, h: 6 },
      ]),
    );
    expect(result.current.widgets.find((slot) => slot.type === "projects")?.position.col).toBe(0);
    expect(mockSave).not.toHaveBeenCalled();
    act(() => result.current.saveLayout());
    expect(mockSave.mock.calls[0]?.[0].config.widgets.find((slot: WidgetSlot) => slot.type === "projects")?.position.col).toBe(0);
    expect(mockSave.mock.calls[0]?.[0].layoutVersion).toBe(2);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it("saves narrow-screen ordering without replacing desktop widget widths", () => {
    const { result } = setup({ data: stored(twoWidgets) });
    act(() =>
      result.current.applyStackedLayout([
        { i: "projects", x: 0, y: 0, w: 1, h: 6 },
        { i: "my-issues", x: 0, y: 6, w: 1, h: 6 },
      ]),
    );
    expect(result.current.widgets.map((slot) => slot.type)).toEqual(["projects", "my-issues"]);
    expect(result.current.widgets.map((slot) => slot.position.w)).toEqual([6, 6]);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("supports keyboard reordering through the same saved layout contract", () => {
    const { result } = setup({ data: stored(twoWidgets) });
    act(() => result.current.moveWidget("my-issues", 1));
    expect(result.current.widgets.map((slot) => slot.type)).toEqual(["projects", "my-issues"]);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("resets to the permitted default arrangement", () => {
    const { result } = setup({ data: stored(twoWidgets) });
    act(() => result.current.resetLayout());
    expect(result.current.widgets).toHaveLength(8);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("does not carry a retired jump-to slot into the next saved layout", () => {
    const { result } = setup({
      data: stored([
        ...twoWidgets,
        { type: "jump-to", position: { col: 0, row: 6, w: 12, h: 2 } },
      ]),
    });
    act(() => result.current.removeWidget("projects"));
    act(() => result.current.saveLayout());
    expect(mockSave.mock.calls[0]?.[0].config.widgets.some((slot: WidgetSlot) => slot.type === "jump-to")).toBe(false);
  });

  it("keeps the draft and explains a conflict when Done cannot save", () => {
    const view = setup({ data: stored(twoWidgets, 2) });
    act(() => view.result.current.removeWidget("projects"));
    act(() => view.result.current.saveLayout());
    const options = mockSave.mock.calls[0]?.[1];
    act(() => options.onError(new ApiError("Layout version mismatch", 409, "CONFLICT")));
    jest.mocked(useDashboardLayout).mockReturnValue({ data: stored([...twoWidgets].reverse(), 3), isLoading: false } as never);
    view.rerender();
    expect(view.result.current.widgets.map((slot) => slot.type)).toEqual(["my-issues"]);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("draft is still here"));
    act(() => view.result.current.saveLayout());
    expect(mockSave.mock.calls[1]?.[0].layoutVersion).toBe(3);
  });

  it("keeps a dirty draft when a conflict refreshes the stored version", () => {
    const view = setup({ data: stored(twoWidgets, 2) });
    act(() => view.result.current.removeWidget("projects"));
    jest.mocked(useDashboardLayout).mockReturnValue({
      data: stored([...twoWidgets].reverse(), 3),
      isLoading: false,
    } as never);
    view.rerender();
    expect(view.result.current.widgets.map((slot) => slot.type)).toEqual(["my-issues"]);
    act(() => view.result.current.saveLayout());
    expect(mockSave.mock.calls[0]?.[0]).toEqual({
      layoutVersion: 2,
      config: { widgets: [twoWidgets[0]] },
    });
  });

  it("ignores editor mutations while a save is pending", () => {
    const { result } = setup({ data: stored(twoWidgets), isSaving: true });
    act(() => {
      result.current.removeWidget("projects");
      result.current.moveWidget("my-issues", 1);
      result.current.resetLayout();
    });
    expect(result.current.widgets).toEqual(twoWidgets);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("does not send an unchanged layout when Done is clicked", () => {
    const { result } = setup({ data: stored(twoWidgets) });
    act(() => result.current.saveLayout());
    expect(mockSave).not.toHaveBeenCalled();
  });
});
