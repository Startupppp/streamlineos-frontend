import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InfiniteScrollSentinel } from "./infinite-scroll-sentinel";

type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void;

const observers: {
  callback: IntersectionCallback;
  options: IntersectionObserverInit | undefined;
  observed: Element[];
  disconnected: boolean;
}[] = [];

class FakeIntersectionObserver {
  constructor(
    callback: IntersectionCallback,
    options?: IntersectionObserverInit,
  ) {
    this.entry = { callback, options, observed: [], disconnected: false };
    observers.push(this.entry);
  }
  private entry: (typeof observers)[number];
  observe(element: Element) {
    this.entry.observed.push(element);
  }
  disconnect() {
    this.entry.disconnected = true;
  }
  unobserve() {}
}

function intersect(index = 0) {
  const observer = observers[index];
  if (!observer) throw new Error("no observer was created");
  observer.callback([{ isIntersecting: true } as IntersectionObserverEntry]);
}

function installObserver() {
  Reflect.set(globalThis, "IntersectionObserver", FakeIntersectionObserver);
}

function removeObserver() {
  Reflect.deleteProperty(globalThis, "IntersectionObserver");
}

beforeEach(() => {
  observers.length = 0;
  installObserver();
});

afterEach(() => {
  cleanup();
  removeObserver();
});

describe("InfiniteScrollSentinel", () => {
  it("loads the next page when the sentinel scrolls into view, with no button to press", () => {
    const onLoadMore = jest.fn();
    render(
      <InfiniteScrollSentinel
        hasNextPage
        isFetchingNextPage={false}
        onLoadMore={onLoadMore}
        label="Load more tickets"
      />,
    );

    expect(onLoadMore).not.toHaveBeenCalled();
    intersect();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("prefetches before the sentinel is on screen", () => {
    render(
      <InfiniteScrollSentinel
        hasNextPage
        isFetchingNextPage={false}
        onLoadMore={jest.fn()}
        label="Load more"
      />,
    );

    expect(observers[0]?.options?.rootMargin).toBe("0px 0px 300px 0px");
  });

  it("does not stack requests while a page is already in flight", () => {
    const onLoadMore = jest.fn();
    render(
      <InfiniteScrollSentinel
        hasNextPage
        isFetchingNextPage
        onLoadMore={onLoadMore}
        label="Load more"
      />,
    );

    expect(observers).toHaveLength(0);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("stops observing once the collection is exhausted", () => {
    const { rerender } = render(
      <InfiniteScrollSentinel
        hasNextPage
        isFetchingNextPage={false}
        onLoadMore={jest.fn()}
        label="Load more"
      />,
    );
    expect(observers[0]?.disconnected).toBe(false);

    rerender(
      <InfiniteScrollSentinel
        hasNextPage={false}
        isFetchingNextPage={false}
        onLoadMore={jest.fn()}
        label="Load more"
      />,
    );
    expect(observers[0]?.disconnected).toBe(true);
  });

  it("renders nothing once exhausted unless an end message is supplied", () => {
    const { container, rerender } = render(
      <InfiniteScrollSentinel
        hasNextPage={false}
        isFetchingNextPage={false}
        onLoadMore={jest.fn()}
        label="Load more"
      />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(
      <InfiniteScrollSentinel
        hasNextPage={false}
        isFetchingNextPage={false}
        onLoadMore={jest.fn()}
        label="Load more"
        exhausted="That's everything."
      />,
    );
    expect(screen.getByText("That's everything.")).toBeInTheDocument();
  });

  it("announces that more rows are arriving", () => {
    render(
      <InfiniteScrollSentinel
        hasNextPage
        isFetchingNextPage
        onLoadMore={jest.fn()}
        label="Load more"
      />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Loading more…");
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("gives keyboard and screen-reader users a control, since scrolling is not an affordance they have", async () => {
    const user = userEvent.setup();
    const onLoadMore = jest.fn();
    render(
      <InfiniteScrollSentinel
        hasNextPage
        isFetchingNextPage={false}
        onLoadMore={onLoadMore}
        label="Load more tickets"
      />,
    );

    const control = screen.getByRole("button", { name: "Load more tickets" });
    await user.tab();
    expect(control).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("keeps that control usable where IntersectionObserver does not exist", async () => {
    removeObserver();
    const user = userEvent.setup();
    const onLoadMore = jest.fn();
    render(
      <InfiniteScrollSentinel
        hasNextPage
        isFetchingNextPage={false}
        onLoadMore={onLoadMore}
        label="Load more"
      />,
    );

    expect(observers).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
