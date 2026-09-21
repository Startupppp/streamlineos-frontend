import { renderHook } from "@testing-library/react";

const mockPush = jest.fn();
const mockRouter = { push: mockPush };

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
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
});
