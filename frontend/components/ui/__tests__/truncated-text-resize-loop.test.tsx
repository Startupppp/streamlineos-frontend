import { render, act } from "@testing-library/react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * ResizeObserver spy that captures the callback so tests can fire it directly.
 * The global stub in jest.setup.js is a no-op; this replaces it per-suite so
 * we can trigger resize notifications in a controlled way.
 */
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

/**
 * Regression guard for the "ResizeObserver loop completed with undelivered
 * notifications" error that appeared in the chat panel on /chat/channels.
 *
 * Root cause: TruncatedText attached a ResizeObserver whose callback called
 * setTruncated() synchronously. With many TruncatedText instances mounting
 * simultaneously (chat sidebar + message bubbles), the browser queued all
 * their initial observations in one frame. Synchronous state-setter calls
 * within those callbacks produced layout changes during the notification
 * frame, which caused the browser to log the loop notice as a window error
 * event — caught by global-handlers.ts and shipped to the backend log.
 *
 * Fix: the ResizeObserver callback now defers measurement to
 * requestAnimationFrame. The state update therefore happens in the *next*
 * frame, after the browser has finished delivering the current batch of
 * notifications — breaking the loop condition.
 */
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

    // Simulate a layout change where the element now overflows its container.
    if (span) setSpanWidths(span, 400, 100);

    // Fire the ResizeObserver callback — this is the call that would previously
    // call setTruncated synchronously and cause the browser loop notice.
    const observer = SpyResizeObserver.instances.at(-1);
    expect(observer).toBeDefined();
    observer!.fire();

    // State MUST NOT have changed yet — the update is deferred via
    // requestAnimationFrame, so no React re-render has run yet.
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

    // Fire the observer twice in quick succession before the RAF executes.
    observer.fire();
    observer.fire();

    // cancelAnimationFrame must have been called at least once — the second
    // fire cancels the first pending RAF before scheduling a new one.
    expect(cancelSpy).toHaveBeenCalled();

    act(() => {
      jest.runAllTimers();
    });

    // Still settles correctly: truncated=true after the RAF that was NOT cancelled.
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

    // Unmount before the RAF runs — setNode(null) is called, which cancels the RAF.
    unmount();

    expect(cancelSpy).toHaveBeenCalled();

    cancelSpy.mockRestore();
  });

  it("does not render a button trigger that would swallow clicks on a wrapping link", () => {
    renderText("signos");
    expect(document.querySelector('[role="button"]')).toBeNull();
  });
});
