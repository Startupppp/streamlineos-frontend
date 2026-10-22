import { render, act } from "@testing-library/react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { TooltipProvider } from "@/components/ui/tooltip";

class SpyResizeObserver {
  static instances: SpyResizeObserver[] = [];
  readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    SpyResizeObserver.instances.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}

  fire(): void {
    this.callback([], this as unknown as ResizeObserver);
  }
}

function setSpanWidths(
  span: HTMLElement,
  scrollWidth: number,
  clientWidth: number,
): void {
  Object.defineProperty(span, "scrollWidth", {
    value: scrollWidth,
    configurable: true,
  });
  Object.defineProperty(span, "clientWidth", {
    value: clientWidth,
    configurable: true,
  });
}

function renderText(text: string) {
  return render(
    <TooltipProvider>
      <TruncatedText text={text} />
    </TooltipProvider>,
  );
}

beforeEach(() => {
  SpyResizeObserver.instances = [];
  jest.useFakeTimers();
  (globalThis as Record<string, unknown>).ResizeObserver = SpyResizeObserver;
});

afterEach(() => {
  act(() => {
    jest.runAllTimers();
  });
  jest.useRealTimers();
});

describe("TruncatedText ResizeObserver does not set state synchronously in its callback", () => {
  it("does not apply truncation on the attaching ref until requestAnimationFrame", () => {
    renderText("a very long channel name that overflows its container");

    const span = document.querySelector<HTMLSpanElement>("span");
    expect(span).not.toBeNull();
    if (span) setSpanWidths(span, 400, 100);

    expect(span?.hasAttribute("title")).toBe(false);

    act(() => {
      jest.runAllTimers();
    });

    expect(span?.getAttribute("title")).toBe(
      "a very long channel name that overflows its container",
    );
  });

  it("defers the truncation state update to requestAnimationFrame, not synchronously in the observer callback", () => {
    renderText("a very long channel name that overflows its container");

    const span = document.querySelector<HTMLSpanElement>("span");
    expect(span).not.toBeNull();

    expect(span?.hasAttribute("title")).toBe(false);

    if (span) setSpanWidths(span, 400, 100);

    const observer = SpyResizeObserver.instances.at(-1);
    expect(observer).toBeDefined();
    observer!.fire();

    expect(span?.hasAttribute("title")).toBe(false);

    act(() => {
      jest.runAllTimers();
    });

    expect(span?.getAttribute("title")).toBe(
      "a very long channel name that overflows its container",
    );
  });

  it("cancels the previous requestAnimationFrame when the observer fires again before the frame runs", () => {
    renderText("overflow text that will keep resizing");

    const span = document.querySelector<HTMLSpanElement>("span");
    if (span) setSpanWidths(span, 400, 100);

    const observer = SpyResizeObserver.instances.at(-1)!;
    const cancelSpy = jest.spyOn(globalThis, "cancelAnimationFrame");

    observer.fire();
    observer.fire();

    expect(cancelSpy).toHaveBeenCalled();

    act(() => {
      jest.runAllTimers();
    });

    expect(span?.getAttribute("title")).toBe("overflow text that will keep resizing");

    cancelSpy.mockRestore();
  });

  it("cancels the pending requestAnimationFrame when the component unmounts before the frame runs", () => {
    const { unmount } = renderText("text");

    const span = document.querySelector<HTMLSpanElement>("span");
    if (span) setSpanWidths(span, 400, 100);

    const observer = SpyResizeObserver.instances.at(-1)!;
    observer.fire();

    const cancelSpy = jest.spyOn(globalThis, "cancelAnimationFrame");

    unmount();

    expect(cancelSpy).toHaveBeenCalled();

    cancelSpy.mockRestore();
  });

  it("does not render a button trigger that would swallow clicks on a wrapping link", () => {
    renderText("signos");
    expect(document.querySelector('[role="button"]')).toBeNull();
  });
});
