import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { OVERFLOW_EDGE_FADE_CLASS, useHorizontalOverflow } from "./use-horizontal-overflow";

function Row({ label }: { label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const overflow = useHorizontalOverflow(ref);
  return (
    <div ref={ref} data-testid={label} data-hidden-left={overflow.hiddenLeft} data-hidden-right={overflow.hiddenRight} className={OVERFLOW_EDGE_FADE_CLASS}>
      <span>a</span>
      <span>b</span>
    </div>
  );
}

function sizeElement(element: HTMLElement, scrollWidth: number, clientWidth: number) {
  Object.defineProperty(element, "scrollWidth", { configurable: true, value: scrollWidth });
  Object.defineProperty(element, "clientWidth", { configurable: true, value: clientWidth });
}

describe("a horizontally scrolling row says which edge hides more", () => {
  it("marks the right edge when content overflows, then the left edge once scrolled to the end", () => {
    render(<Row label="row" />);
    const element = screen.getByTestId("row");
    sizeElement(element, 900, 390);

    act(() => {
      fireEvent.scroll(element);
    });
    expect(element).toHaveAttribute("data-hidden-right", "true");
    expect(element).toHaveAttribute("data-hidden-left", "false");

    element.scrollLeft = 510;
    act(() => {
      fireEvent.scroll(element);
    });
    expect(element).toHaveAttribute("data-hidden-right", "false");
    expect(element).toHaveAttribute("data-hidden-left", "true");
  });

  it("marks neither edge when everything fits", () => {
    render(<Row label="fits" />);
    const element = screen.getByTestId("fits");
    sizeElement(element, 390, 390);
    act(() => {
      fireEvent.scroll(element);
    });
    expect(element).toHaveAttribute("data-hidden-right", "false");
    expect(element).toHaveAttribute("data-hidden-left", "false");
  });
});
