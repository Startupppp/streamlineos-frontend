import { renderHook, act, fireEvent } from "@testing-library/react";
import { useMyWorkKeyboard } from "./use-my-work-keyboard";

const mockOpen = jest.fn();
const mockClear = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

function setup(itemCount = 5) {
  return renderHook(() =>
    useMyWorkKeyboard({
      itemCount,
      onOpen: mockOpen,
      onClearSelection: mockClear,
    }),
  );
}

describe("useMyWorkKeyboard — j/k navigation moves focus on the list", () => {
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

describe("useMyWorkKeyboard — Enter opens, Escape clears", () => {
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

describe("useMyWorkKeyboard — keys are inert inside form inputs", () => {
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

describe("useMyWorkKeyboard — modifier keys suppress shortcuts", () => {
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
