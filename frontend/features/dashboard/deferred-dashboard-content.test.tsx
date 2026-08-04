import { act, render, screen } from "@testing-library/react";
import { DeferredDashboardContent } from "./deferred-dashboard-content";

let reveal: (() => void) | undefined;

class IntersectionObserverMock {
  constructor(callback: IntersectionObserverCallback) {
    reveal = () =>
      callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
  }

  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  root = null;
  rootMargin = "0px";
  thresholds = [0];
}

describe("DeferredDashboardContent", () => {
  beforeEach(() => {
    reveal = undefined;
    window.IntersectionObserver = IntersectionObserverMock;
  });

  it("mounts query-owning children only after visibility", () => {
    const onVisible = jest.fn();
    render(
      <DeferredDashboardContent
        fallback={<span>placeholder</span>}
        onVisible={onVisible}
      >
        <span>live widget</span>
      </DeferredDashboardContent>,
    );

    expect(screen.getByText("placeholder")).toBeInTheDocument();
    expect(screen.queryByText("live widget")).not.toBeInTheDocument();
    expect(onVisible).not.toHaveBeenCalled();

    act(() => reveal?.());

    expect(screen.getByText("live widget")).toBeInTheDocument();
    expect(onVisible).toHaveBeenCalledTimes(1);
  });
});
