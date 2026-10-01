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

describe("input-element guard — shortcuts do not fire while the user is typing in a form field", () => {
  it("does not call onCreateProject when a c+p chord originates from an INPUT element", () => {
    renderHook(() =>
      useKeyboardShortcuts(mockOnCreateProject, mockOnCreateIssue),
    );
    const input = document.createElement("input");
    document.body.appendChild(input);
    try {
      act(() => {
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "c", bubbles: true, cancelable: true }));
      });
      act(() => {
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "p", bubbles: true, cancelable: true }));
      });
      expect(mockOnCreateProject).not.toHaveBeenCalled();
    } finally {
      document.body.removeChild(input);
    }
  });

  it("does not navigate when a g+p chord originates from a TEXTAREA element", () => {
    renderHook(() =>
      useKeyboardShortcuts(mockOnCreateProject, mockOnCreateIssue),
    );
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    try {
      act(() => {
        textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "g", bubbles: true, cancelable: true }));
      });
      act(() => {
        textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "p", bubbles: true, cancelable: true }));
      });
      expect(mockPush).not.toHaveBeenCalled();
    } finally {
      document.body.removeChild(textarea);
    }
  });

  it("does not call onCreateIssue when a c+t chord originates from a contentEditable element such as a rich-text editor", () => {
    renderHook(() =>
      useKeyboardShortcuts(mockOnCreateProject, mockOnCreateIssue),
    );
    const div = document.createElement("div");
    div.contentEditable = "true";
    document.body.appendChild(div);
    try {
      act(() => {
        div.dispatchEvent(new KeyboardEvent("keydown", { key: "c", bubbles: true, cancelable: true }));
      });
      act(() => {
        div.dispatchEvent(new KeyboardEvent("keydown", { key: "t", bubbles: true, cancelable: true }));
      });
      expect(mockOnCreateIssue).not.toHaveBeenCalled();
    } finally {
      document.body.removeChild(div);
    }
  });

  it("still fires when the event originates from document.body confirming that non-input surfaces remain active", () => {
    renderHook(() =>
      useKeyboardShortcuts(mockOnCreateProject, mockOnCreateIssue),
    );
    act(() => press("c"));
    act(() => press("p"));
    expect(mockOnCreateProject).toHaveBeenCalledTimes(1);
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
