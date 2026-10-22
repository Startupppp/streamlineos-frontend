import { render, screen } from "@testing-library/react";
import { act } from "react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Users } from "lucide-react";


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

  it("stays out of the tab order when a child is already focusable", () => {
    render(
      <StatCardGrid>
        <a href="/users">Directory</a>
        <StatCard label="Active users" value={42} icon={Users} />
      </StatCardGrid>,
    );
    setWidths(grid(), 1200, 400);
    StubResizeObserver.instances[0]?.fire();

    expect(grid()).not.toHaveAttribute("tabindex");
    expect(screen.getByRole("link", { name: "Directory" })).toBeInTheDocument();
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
