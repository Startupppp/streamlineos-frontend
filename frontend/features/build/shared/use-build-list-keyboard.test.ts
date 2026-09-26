import { renderHook, act, fireEvent } from "@testing-library/react";
import { useBuildListKeyboard } from "./use-build-list-keyboard";

const mockOpen = jest.fn();
const mockClear = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
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
