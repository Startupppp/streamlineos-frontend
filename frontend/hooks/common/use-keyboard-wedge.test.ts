import { renderHook } from "@testing-library/react";
import { useKeyboardWedge } from "./use-keyboard-wedge";

function press(key: string): void {
  document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

function advance(ms: number): void {
  jest.setSystemTime(Date.now() + ms);
}

describe("useKeyboardWedge", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-28T00:00:00Z"));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("reports a payload typed at scanner speed", () => {
    const onScan = jest.fn();
    renderHook(() => useKeyboardWedge(onScan));

    for (const ch of "SKU-9911") {
      advance(3);
      press(ch);
    }
    advance(3);
    press("Enter");

    expect(onScan).toHaveBeenCalledWith("SKU-9911");
  });

  it("ignores the same characters typed by a human", () => {
    const onScan = jest.fn();
    renderHook(() => useKeyboardWedge(onScan));

    for (const ch of "SKU-9911") {
      advance(120);
      press(ch);
    }
    advance(120);
    press("Enter");

    expect(onScan).not.toHaveBeenCalled();
  });

  it("does not let a preceding keystroke contaminate a scan", () => {
    const onScan = jest.fn();
    renderHook(() => useKeyboardWedge(onScan));

    press("x");
    advance(500);
    for (const ch of "ABC123") {
      advance(3);
      press(ch);
    }
    advance(3);
    press("Enter");

    expect(onScan).toHaveBeenCalledWith("ABC123");
  });

  it("refuses a payload too short to be a scan", () => {
    const onScan = jest.fn();
    renderHook(() => useKeyboardWedge(onScan, { minLength: 4 }));

    for (const ch of "AB") {
      advance(3);
      press(ch);
    }
    advance(3);
    press("Enter");

    expect(onScan).not.toHaveBeenCalled();
  });

  it("leaves keys that are not payload out of the buffer", () => {
    const onScan = jest.fn();
    renderHook(() => useKeyboardWedge(onScan));

    advance(3);
    press("A");
    advance(3);
    press("Shift");
    advance(3);
    press("ArrowLeft");
    advance(3);
    press("B");
    advance(3);
    press("C");
    advance(3);
    press("D");
    advance(3);
    press("Enter");

    expect(onScan).toHaveBeenCalledWith("ABCD");
  });

  it("stops listening when disabled", () => {
    const onScan = jest.fn();
    renderHook(() => useKeyboardWedge(onScan, { enabled: false }));

    for (const ch of "SKU-9911") {
      advance(3);
      press(ch);
    }
    advance(3);
    press("Enter");

    expect(onScan).not.toHaveBeenCalled();
  });
});
