import { renderHook, act, fireEvent } from "@testing-library/react";
import { useBuildListKeyboard } from "./use-build-list-keyboard";
import {
  claimBuildListSearchTarget,
  tryHandleBuildListSearchShortcut,
} from "@/lib/build/build-list-search-target";

const mockOpen = jest.fn();
const mockClear = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  claimBuildListSearchTarget({ current: null })();
});

function setup(itemCount = 5) {
  return renderHook(() =>
    useBuildListKeyboard({
      itemCount,
      onOpen: mockOpen,
      onClearSelection: mockClear,
    }),
  );
}

describe("useBuildListKeyboard — j/k navigation moves focus on the list", () => {
  it("j key moves focused index from null to 0 when no item is focused", () => {
    const { result } = setup();
    expect(result.current.focusedIndex).toBeNull();

    act(() => {
      fireEvent.keyDown(document.body, { key: "j" });
    });

    expect(result.current.focusedIndex).toBe(0);
  });

  it("j key moves focus CAN advance to the second item", () => {
    const { result } = setup();

    act(() => {
      fireEvent.keyDown(document.body, { key: "j" });
    });
    act(() => {
      fireEvent.keyDown(document.body, { key: "j" });
    });

    expect(result.current.focusedIndex).toBe(1);
  });

  it("k key moves focused index backward when an item is focused", () => {
    const { result } = setup();

    act(() => {
      fireEvent.keyDown(document.body, { key: "j" });
    });
    act(() => {
      fireEvent.keyDown(document.body, { key: "j" });
    });
    act(() => {
      fireEvent.keyDown(document.body, { key: "k" });
    });

    expect(result.current.focusedIndex).toBe(0);
  });

  it("k key returns to null when already at index 0", () => {
    const { result } = setup();

    act(() => {
      fireEvent.keyDown(document.body, { key: "j" });
    });
    act(() => {
      fireEvent.keyDown(document.body, { key: "k" });
    });

    expect(result.current.focusedIndex).toBeNull();
  });

  it("j key cannot advance past the last item so the list does not wrap or throw", () => {
    const { result } = setup(2);

    act(() => {
      fireEvent.keyDown(document.body, { key: "j" });
    });
    act(() => {
      fireEvent.keyDown(document.body, { key: "j" });
    });
    act(() => {
      fireEvent.keyDown(document.body, { key: "j" });
    });

    expect(result.current.focusedIndex).toBe(1);
  });
});

describe("useBuildListKeyboard — Enter opens, Escape clears", () => {
  it("Enter calls onOpen with the focused index when an item is focused", () => {
    const { result } = setup();

    act(() => {
      fireEvent.keyDown(document.body, { key: "j" });
    });
    act(() => {
      fireEvent.keyDown(document.body, { key: "j" });
    });
    act(() => {
      fireEvent.keyDown(document.body, { key: "Enter" });
    });

    expect(mockOpen).toHaveBeenCalledWith(1);
  });

  it("Enter is a no-op when no item is focused so it cannot open the wrong ticket", () => {
    setup();

    act(() => {
      fireEvent.keyDown(document.body, { key: "Enter" });
    });

    expect(mockOpen).not.toHaveBeenCalled();
  });

  it("Escape calls onClearSelection and resets the focused index", () => {
    const { result } = setup();

    act(() => {
      fireEvent.keyDown(document.body, { key: "j" });
    });
    act(() => {
      fireEvent.keyDown(document.body, { key: "Escape" });
    });

    expect(mockClear).toHaveBeenCalled();
    expect(result.current.focusedIndex).toBeNull();
  });
});

describe("useBuildListKeyboard — keys are inert inside form inputs", () => {
  it("j key does not move focus when the active element is an input so the user can type freely", () => {
    const { result } = setup();

    const input = document.createElement("input");
    document.body.appendChild(input);

    act(() => {
      fireEvent.keyDown(input, { key: "j" });
    });

    expect(result.current.focusedIndex).toBeNull();

    document.body.removeChild(input);
  });

  it("j key moves focus when pressed on the body, proving the guard is scoped only to inputs", () => {
    const { result } = setup();

    act(() => {
      fireEvent.keyDown(document.body, { key: "j" });
    });

    expect(result.current.focusedIndex).toBe(0);
  });

  it("j key does not move focus when the active element is a textarea", () => {
    const { result } = setup();

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);

    act(() => {
      fireEvent.keyDown(textarea, { key: "j" });
    });

    expect(result.current.focusedIndex).toBeNull();

    document.body.removeChild(textarea);
  });
});

describe("useBuildListKeyboard — modifier keys suppress shortcuts", () => {
  it("j with metaKey held does not move focus", () => {
    const { result } = setup();

    act(() => {
      fireEvent.keyDown(document.body, { key: "j", metaKey: true });
    });

    expect(result.current.focusedIndex).toBeNull();
  });

  it("j with ctrlKey held does not move focus", () => {
    const { result } = setup();

    act(() => {
      fireEvent.keyDown(document.body, { key: "j", ctrlKey: true });
    });

    expect(result.current.focusedIndex).toBeNull();
  });

  it("j without any modifier moves focus, confirming the modifier check is the only gate", () => {
    const { result } = setup();

    act(() => {
      fireEvent.keyDown(document.body, { key: "j" });
    });

    expect(result.current.focusedIndex).toBe(0);
  });
});

describe("useBuildListKeyboard — ? opens shortcut help overlay when the callback is provided", () => {
  const mockShortcutHelp = jest.fn();

  beforeEach(() => {
    mockShortcutHelp.mockClear();
  });

  it("? calls onShortcutHelp when the callback is provided", () => {
    renderHook(() =>
      useBuildListKeyboard({
        itemCount: 3,
        onOpen: mockOpen,
        onClearSelection: mockClear,
        onShortcutHelp: mockShortcutHelp,
      }),
    );
    act(() => {
      fireEvent.keyDown(document.body, { key: "?" });
    });
    expect(mockShortcutHelp).toHaveBeenCalledTimes(1);
  });

  it("? is a no-op when onShortcutHelp is not provided so omitting it does not throw", () => {
    setup();
    expect(() =>
      act(() => {
        fireEvent.keyDown(document.body, { key: "?" });
      }),
    ).not.toThrow();
  });

  it("? does not fire while typing in a text input so the user can type question marks freely", () => {
    renderHook(() =>
      useBuildListKeyboard({
        itemCount: 3,
        onOpen: mockOpen,
        onClearSelection: mockClear,
        onShortcutHelp: mockShortcutHelp,
      }),
    );
    const input = document.createElement("input");
    document.body.appendChild(input);
    act(() => {
      fireEvent.keyDown(input, { key: "?" });
    });
    expect(mockShortcutHelp).not.toHaveBeenCalled();
    input.remove();
  });
});

describe("useBuildListKeyboard — / focuses the page search", () => {
  function setupWithSearch(ref: { current: HTMLInputElement | null }) {
    return renderHook(() =>
      useBuildListKeyboard({
        itemCount: 5,
        onOpen: mockOpen,
        onClearSelection: mockClear,
        searchInputRef: ref,
      }),
    );
  }

  it("/ moves focus into the search input the page handed it", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    setupWithSearch({ current: input });

    act(() => {
      fireEvent.keyDown(document.body, { key: "/" });
    });

    expect(document.activeElement).toBe(input);
    input.remove();
  });

  it("/ does not throw when the page has no search input to focus", () => {
    setupWithSearch({ current: null });

    expect(() =>
      act(() => {
        fireEvent.keyDown(document.body, { key: "/" });
      }),
    ).not.toThrow();
  });

  it("/ does not steal focus while the user is already typing, so a slash can be typed into a field", () => {
    const search = document.createElement("input");
    const other = document.createElement("textarea");
    document.body.appendChild(search);
    document.body.appendChild(other);
    other.focus();
    setupWithSearch({ current: search });

    act(() => {
      fireEvent.keyDown(other, { key: "/" });
    });

    expect(document.activeElement).toBe(other);
    search.remove();
    other.remove();
  });

  it("claims the shared search target while enabled so the global / handler defers to page search", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    const { unmount } = setupWithSearch({ current: input });

    expect(tryHandleBuildListSearchShortcut()).toBe(true);
    expect(document.activeElement).toBe(input);

    unmount();
    expect(tryHandleBuildListSearchShortcut()).toBe(false);
    input.remove();
  });
});

describe("useBuildListKeyboard — the input guard covers every editable target", () => {
  it("j does not move focus inside a native select", () => {
    const select = document.createElement("select");
    document.body.appendChild(select);
    const { result } = setup();

    act(() => {
      fireEvent.keyDown(select, { key: "j" });
    });

    expect(result.current.focusedIndex).toBeNull();
    select.remove();
  });

  it("j does not move focus when the target is a contenteditable=false atomic node inside a contenteditable=true editor, because the user is mid-composition in a rich-text field", () => {
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "true");
    const atomicNode = document.createElement("span");
    atomicNode.setAttribute("contenteditable", "false");
    editor.appendChild(atomicNode);
    document.body.appendChild(editor);
    const { result } = setup();

    act(() => {
      fireEvent.keyDown(atomicNode, { key: "j" });
    });

    expect(result.current.focusedIndex).toBeNull();
    editor.remove();
  });
});

describe("useBuildListKeyboard — c creates and e edits, so no page needs its own keydown listener", () => {
  const mockCreate = jest.fn();
  const mockEdit = jest.fn();

  function setupWithActions(itemCount = 5) {
    return renderHook(() =>
      useBuildListKeyboard({
        itemCount,
        onOpen: mockOpen,
        onEdit: mockEdit,
        onCreate: mockCreate,
        onClearSelection: mockClear,
      }),
    );
  }

  beforeEach(() => {
    mockCreate.mockClear();
    mockEdit.mockClear();
  });

  it("c calls onCreate without needing a focused row", () => {
    setupWithActions();
    act(() => {
      fireEvent.keyDown(document.body, { key: "c" });
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("e calls onEdit with the focused index once a row is focused", () => {
    const { result } = setupWithActions();
    act(() => {
      fireEvent.keyDown(document.body, { key: "j" });
    });
    expect(result.current.focusedIndex).toBe(0);
    act(() => {
      fireEvent.keyDown(document.body, { key: "e" });
    });
    expect(mockEdit).toHaveBeenCalledWith(0);
  });

  it("e does nothing while no row is focused, rather than editing an arbitrary row", () => {
    setupWithActions();
    act(() => {
      fireEvent.keyDown(document.body, { key: "e" });
    });
    expect(mockEdit).not.toHaveBeenCalled();
  });

  it("neither c nor e fires while typing in a text input", () => {
    setupWithActions();
    const input = document.createElement("input");
    document.body.appendChild(input);
    act(() => {
      fireEvent.keyDown(input, { key: "c" });
      fireEvent.keyDown(input, { key: "e" });
    });
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockEdit).not.toHaveBeenCalled();
    input.remove();
  });

  it("c is inert when the caller supplies no onCreate, so a read-only list is unaffected", () => {
    renderHook(() =>
      useBuildListKeyboard({
        itemCount: 5,
        onOpen: mockOpen,
        onClearSelection: mockClear,
      }),
    );
    act(() => {
      fireEvent.keyDown(document.body, { key: "c" });
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
