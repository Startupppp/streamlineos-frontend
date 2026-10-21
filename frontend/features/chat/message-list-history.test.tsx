import { createRef } from "react";
import { act, render, screen } from "@testing-library/react";
import {
  grouped,
  installMessageListEnvironment,
  layout,
  observers,
  props,
  scrollIntoView,
} from "./message-list-test-harness";
import { MessageList } from "./message-list";

installMessageListEnvironment();

function fireIntersection() {
  const observer = observers[observers.length - 1];
  act(() => {
    observer.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });
}

describe("MessageList — older history loads by infinite scroll, never a button", () => {
  it("renders no older-history button while more history exists", () => {
    render(<MessageList {...props({ showScrollBtn: true })} />);
    expect(screen.queryByRole("button", { name: /older/i })).toBeNull();
    expect(document.querySelector("[data-older-history-sentinel]")).not.toBeNull();
  });

  it("drops the keyboard fallback once history is exhausted", () => {
    render(<MessageList {...props({ showScrollBtn: true, hasNextPage: false })} />);
    expect(screen.queryByRole("button", { name: /older/i })).toBeNull();
  });

  it("observes the top sentinel inside the conversation's scroll viewport, not the window", () => {
    const scrollContainerRef = createRef<HTMLDivElement>();
    render(<MessageList {...props({ showScrollBtn: true, scrollContainerRef })} />);
    expect(observers).toHaveLength(1);
    expect(observers[0].options?.root).toBe(scrollContainerRef.current);
    expect(scrollContainerRef.current).not.toBeNull();
  });

  it("holds the observer back while the reader sits at the latest message, so opening a channel does not pull an extra page", () => {
    const fetchNextPage = jest.fn();
    render(<MessageList {...props({ showScrollBtn: false, fetchNextPage })} />);
    expect(observers).toHaveLength(0);
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("the sentinel coming into view fetches the next older page", () => {
    const fetchNextPage = jest.fn();
    render(<MessageList {...props({ showScrollBtn: true, fetchNextPage })} />);
    fireIntersection();
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("loads older history when the first page does not fill the viewport, so there is nothing to scroll", () => {
    layout.scrollHeight = 400;
    const fetchNextPage = jest.fn();
    const groupedMessages = grouped([10, 11, 12]);
    const { rerender } = render(<MessageList {...props({ fetchNextPage, groupedMessages })} />);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);

    rerender(
      <MessageList {...props({ fetchNextPage, groupedMessages, isFetchingNextPage: true })} />,
    );
    rerender(<MessageList {...props({ fetchNextPage, groupedMessages })} />);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);

    rerender(<MessageList {...props({ fetchNextPage, groupedMessages: grouped([9, 10, 11, 12]) })} />);
    expect(fetchNextPage).toHaveBeenCalledTimes(2);
  });

  it("restores the reader's distance from the bottom after older messages are prepended", () => {
    const fetchNextPage = jest.fn();
    const scrollContainerRef = createRef<HTMLDivElement>();
    const { rerender } = render(
      <MessageList {...props({ showScrollBtn: true, fetchNextPage, scrollContainerRef })} />,
    );
    const viewport = scrollContainerRef.current;
    if (!viewport) throw new Error("no viewport");
    viewport.scrollTop = 100;
    fireIntersection();

    rerender(
      <MessageList
        {...props({ showScrollBtn: true, fetchNextPage, scrollContainerRef, isFetchingNextPage: true })}
      />,
    );
    layout.scrollHeight = 2600;
    rerender(
      <MessageList
        {...props({
          showScrollBtn: true,
          fetchNextPage,
          scrollContainerRef,
          groupedMessages: grouped([7, 8, 9, 10, 11, 12]),
        })}
      />,
    );
    expect(viewport.scrollTop).toBe(700);
  });
});

describe("MessageList — a failed older-page fetch leaves no stale scroll restore", () => {
  it("forgets the pending restore once the fetch settles without new content", () => {
    const fetchNextPage = jest.fn();
    const scrollContainerRef = createRef<HTMLDivElement>();
    const groupedMessages = grouped([10, 11, 12]);
    const { rerender } = render(
      <MessageList {...props({ showScrollBtn: true, fetchNextPage, scrollContainerRef, groupedMessages })} />,
    );
    const viewport = scrollContainerRef.current;
    if (!viewport) throw new Error("no viewport");
    viewport.scrollTop = 100;
    fireIntersection();
    rerender(
      <MessageList
        {...props({ showScrollBtn: true, fetchNextPage, scrollContainerRef, groupedMessages, isFetchingNextPage: true })}
      />,
    );
    rerender(
      <MessageList {...props({ showScrollBtn: true, fetchNextPage, scrollContainerRef, groupedMessages })} />,
    );

    layout.scrollHeight = 2100;
    rerender(
      <MessageList
        {...props({ showScrollBtn: true, fetchNextPage, scrollContainerRef, groupedMessages: grouped([10, 11, 12, 13]) })}
      />,
    );
    expect(viewport.scrollTop).toBe(100);
  });
});

describe("MessageList — the older-history guards key on content, not array identity", () => {
  it("does not auto-fetch again when the same messages re-render as a new array after a failed fetch", () => {
    layout.scrollHeight = 400;
    const fetchNextPage = jest.fn();
    const { rerender } = render(<MessageList {...props({ fetchNextPage })} />);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    rerender(<MessageList {...props({ fetchNextPage, isFetchingNextPage: true })} />);
    rerender(<MessageList {...props({ fetchNextPage, groupedMessages: grouped([10, 11, 12]) })} />);
    rerender(<MessageList {...props({ fetchNextPage, groupedMessages: grouped([10, 11, 12]) })} />);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("a fetch that adds no older page never restores scroll later, even while more history is advertised", () => {
    const fetchNextPage = jest.fn();
    const scrollContainerRef = createRef<HTMLDivElement>();
    const { rerender } = render(
      <MessageList {...props({ showScrollBtn: true, fetchNextPage, scrollContainerRef })} />,
    );
    const viewport = scrollContainerRef.current;
    if (!viewport) throw new Error("no viewport");
    viewport.scrollTop = 100;
    fireIntersection();

    layout.scrollHeight = 2100;
    rerender(
      <MessageList
        {...props({
          showScrollBtn: true,
          fetchNextPage,
          scrollContainerRef,
          hasNextPage: true,
          groupedMessages: grouped([10, 11, 12, 13]),
        })}
      />,
    );
    expect(viewport.scrollTop).toBe(100);

    layout.scrollHeight = 2700;
    rerender(
      <MessageList
        {...props({
          showScrollBtn: true,
          fetchNextPage,
          scrollContainerRef,
          hasNextPage: true,
          groupedMessages: grouped([4, 5, 10, 11, 12, 13]),
        })}
      />,
    );
    expect(viewport.scrollTop).toBe(100);
  });
});

describe("MessageList — ?message lands on the exact message", () => {
  it("scrolls to and highlights the target once it is rendered", () => {
    const fetchNextPage = jest.fn();
    const { container } = render(
      <MessageList {...props({ scrollToMessageId: 11, fetchNextPage })} />,
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(fetchNextPage).not.toHaveBeenCalled();
    expect(scrollIntoView).toHaveBeenCalled();
    expect(container.querySelector('[data-anchored="true"] #message-11')).not.toBeNull();
  });

  it("never pages history looking for a target that is not rendered; the timeline hook owns hydration", () => {
    const fetchNextPage = jest.fn();
    const { rerender, container } = render(
      <MessageList {...props({ scrollToMessageId: 3, fetchNextPage })} />,
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(fetchNextPage).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();

    rerender(
      <MessageList {...props({ scrollToMessageId: 3, fetchNextPage, groupedMessages: grouped([2, 3, 4]) })} />,
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(scrollIntoView).toHaveBeenCalled();
    expect(container.querySelector('[data-anchored="true"] #message-3')).not.toBeNull();
  });

  it("labels the latest control with the label it is given", () => {
    render(<MessageList {...props({ showScrollBtn: true, latestLabel: "Jump to latest" })} />);
    expect(screen.getByRole("button", { name: /Jump to latest/ })).toBeInTheDocument();
  });
});
