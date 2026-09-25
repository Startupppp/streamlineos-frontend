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
