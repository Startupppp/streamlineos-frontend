import { act, renderHook } from "@testing-library/react";

const mockPush = jest.fn();
const mockRouter = { push: mockPush };
const requestLeave = jest.fn((action: () => void) => action());

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));
jest.mock("@/components/shared/dirty-state-context", () => ({
  useNavigationLeave: () => requestLeave,
}));

import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";

const mockOnCreateProject = jest.fn();
const mockOnCreateIssue = jest.fn();

function press(key: string, modifiers: Partial<KeyboardEventInit> = {}) {
  document.body.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...modifiers }),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  requestLeave.mockImplementation((action: () => void) => action());
});

describe("c+p and c+t shortcuts fire the correct create callback", () => {
  it("c then p calls onCreateProject", () => {
    renderHook(() =>
      useKeyboardShortcuts(mockOnCreateProject, mockOnCreateIssue),
    );
    act(() => press("c"));
    act(() => press("p"));
    expect(mockOnCreateProject).toHaveBeenCalledTimes(1);
  });

  it("c then t calls onCreateIssue", () => {
    renderHook(() =>
      useKeyboardShortcuts(mockOnCreateProject, mockOnCreateIssue),
    );
    act(() => press("c"));
    act(() => press("t"));
    expect(mockOnCreateIssue).toHaveBeenCalledTimes(1);
  });
});

describe("g+p shortcut navigates to the projects list", () => {
  it("g then p navigates to /build", () => {
    renderHook(() =>
      useKeyboardShortcuts(mockOnCreateProject, mockOnCreateIssue),
    );
    act(() => press("g"));
    act(() => press("p"));
    expect(mockPush).toHaveBeenCalledWith("/build");
  });
});

describe("? shortcut opens the shortcut help overlay", () => {
  it("? calls onShortcutHelp when the callback is provided", () => {
    const mockHelp = jest.fn();
    renderHook(() => useKeyboardShortcuts(mockOnCreateProject, mockOnCreateIssue, mockHelp));
    act(() => press("?"));
    expect(mockHelp).toHaveBeenCalledTimes(1);
  });

  it("? pressed mid-chord clears the pending chord before opening the overlay", () => {
    const mockHelp = jest.fn();
    renderHook(() => useKeyboardShortcuts(mockOnCreateProject, mockOnCreateIssue, mockHelp));
    act(() => press("c"));
    act(() => press("?"));
    expect(mockHelp).toHaveBeenCalledTimes(1);
    expect(mockOnCreateProject).not.toHaveBeenCalled();
  });

  it("? is a no-op when onShortcutHelp is not provided and does not throw", () => {
    renderHook(() => useKeyboardShortcuts(mockOnCreateProject, mockOnCreateIssue));
    expect(() => act(() => press("?"))).not.toThrow();
  });
});

describe("modifier guard — command-center shortcuts do not fire on Cmd/Ctrl/Alt combos", () => {
  it("does not navigate when Cmd+g is pressed", () => {
    renderHook(() =>
      useKeyboardShortcuts(mockOnCreateProject, mockOnCreateIssue),
    );
    press("g", { metaKey: true });
    press("m");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does not call onCreateProject when Ctrl+c is pressed", () => {
    renderHook(() =>
      useKeyboardShortcuts(mockOnCreateProject, mockOnCreateIssue),
    );
    press("c", { ctrlKey: true });
    press("p");
    expect(mockOnCreateProject).not.toHaveBeenCalled();
  });

  it("guards g then m navigation", () => {
    let pendingNavigation: (() => void) | undefined;
    requestLeave.mockImplementation((action: () => void) => {
      pendingNavigation = action;
    });
    renderHook(() =>
      useKeyboardShortcuts(mockOnCreateProject, mockOnCreateIssue),
    );

    act(() => press("g"));
    act(() => press("m"));

    expect(requestLeave).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    pendingNavigation?.();
    expect(mockPush).toHaveBeenCalledWith("/build/my-work");
  });
});
