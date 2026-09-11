import { render, screen } from "@testing-library/react";
import { act } from "react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Users } from "lucide-react";

/**
 * `StatCardGrid` is `overflow-x-auto` at every breakpoint by design — the ROW
 * scrolls so the PAGE never does. A `StatCard` with no `href` renders nothing
 * focusable, so a keyboard user could not scroll the row at all and never
 * reached the cards past the fold. axe reported `scrollable-region-focusable`
 * on it across five routes; WCAG 2.1.1.
 *
 * The literal fix axe asks for is `tabIndex={0}`, and taken literally it adds
 * a tab stop to nearly every list page in the product whether or not that
 * page's row actually overflows. So the stop is conditional on the measured
 * overflow: present when there is something off screen to reach, absent when
 * every card fits, and absent when the cards are links because those are
 * already in the tab order. That is the whole reason the previous session
 * declined the one-line version.
 *
 * jsdom reports `scrollWidth === clientWidth === 0` for everything, so the
 * measurement is driven here by defining the two properties on the element —
 * which is what makes the three branches distinguishable at all.
 */

function setWidths(element: HTMLElement, scrollWidth: number, clientWidth: number) {
  Object.defineProperty(element, "scrollWidth", { value: scrollWidth, configurable: true });
  Object.defineProperty(element, "clientWidth", { value: clientWidth, configurable: true });
}

function grid(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-slot="stat-card-grid"]');
  if (!element) throw new Error("no stat card grid rendered");
  return element;
}

class StubResizeObserver {
  static instances: StubResizeObserver[] = [];
  callback: () => void;
  constructor(callback: () => void) {
    this.callback = callback;
    StubResizeObserver.instances.push(this);
  }
  observe() {}
  disconnect() {}
  fire() {
    act(() => {
      this.callback();
    });
  }
}

beforeEach(() => {
  StubResizeObserver.instances = [];
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    StubResizeObserver;
});

describe("the stats row is reachable exactly when it scrolls", () => {
  it("takes a tab stop when it overflows and has nothing focusable inside", () => {
    render(
      <StatCardGrid>
        <StatCard label="Active users" value={42} icon={Users} />
        <StatCard label="Invited" value={7} icon={Users} />
      </StatCardGrid>,
    );
    setWidths(grid(), 1200, 400);
    StubResizeObserver.instances[0]?.fire();

    const region = screen.getByRole("group", { name: "Summary statistics" });
    expect(region).toHaveAttribute("tabindex", "0");
  });

  it("stays out of the tab order when every card fits", () => {
    render(
      <StatCardGrid>
        <StatCard label="Active users" value={42} icon={Users} />
      </StatCardGrid>,
    );
    setWidths(grid(), 400, 400);
    StubResizeObserver.instances[0]?.fire();

    expect(grid()).not.toHaveAttribute("tabindex");
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("stays out of the tab order when the cards are links, which already are in it", () => {
    render(
      <StatCardGrid>
        <StatCard label="Active users" value={42} icon={Users} href="/users" />
        <StatCard label="Invited" value={7} icon={Users} href="/users/invites" />
      </StatCardGrid>,
    );
    setWidths(grid(), 1200, 400);
    StubResizeObserver.instances[0]?.fire();

    expect(grid()).not.toHaveAttribute("tabindex");
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("gives up the tab stop again when a resize removes the overflow", () => {
    render(
      <StatCardGrid>
        <StatCard label="Active users" value={42} icon={Users} />
        <StatCard label="Invited" value={7} icon={Users} />
      </StatCardGrid>,
    );
    setWidths(grid(), 1200, 400);
    StubResizeObserver.instances[0]?.fire();
    expect(grid()).toHaveAttribute("tabindex", "0");

    setWidths(grid(), 400, 400);
    StubResizeObserver.instances[0]?.fire();
    expect(grid()).not.toHaveAttribute("tabindex");
  });

  it("the tab stop is named, so landing on it says why focus stopped there", () => {
    render(
      <StatCardGrid>
        <StatCard label="Active users" value={42} icon={Users} />
        <StatCard label="Invited" value={7} icon={Users} />
      </StatCardGrid>,
    );
    setWidths(grid(), 1200, 400);
    StubResizeObserver.instances[0]?.fire();
    expect(grid()).toHaveAccessibleName("Summary statistics");
  });
});
