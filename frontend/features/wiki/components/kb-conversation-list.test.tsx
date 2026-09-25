import { render, screen, cleanup } from "@testing-library/react";
import { KbConversationList } from "./kb-conversation-list";

type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void;

const observers: {
  callback: IntersectionCallback;
  options: IntersectionObserverInit | undefined;
  observed: Element[];
  disconnected: boolean;
}[] = [];

class FakeIntersectionObserver {
  constructor(callback: IntersectionCallback, options?: IntersectionObserverInit) {
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

jest.mock("@/features/wiki/lib/kb-icons", () => ({
  KbMessageCircleIcon: ({ className }: { className?: string }) => <span className={className} />,
  KbMoreHorizontalIcon: ({ className }: { className?: string }) => <span className={className} />,
  KbPenLineIcon: ({ className }: { className?: string }) => <span className={className} />,
  KbSearchIcon: ({ className }: { className?: string }) => <span className={className} />,
  KbTrash2Icon: ({ className }: { className?: string }) => <span className={className} />,
  KbXIcon: ({ className }: { className?: string }) => <span className={className} />,
}));

jest.mock("@/components/layout/sidebar/sidebar-animated-nav", () => ({
  SidebarAnimatedNavIcon: ({ className }: { className?: string }) => <span className={className} />,
  useAnimatedNavIconHover: () => ({
    iconRef: { current: null },
    animatedNavHoverHandlers: {},
  }),
}));

const baseProps = {
  conversations: [
    {
      id: 1,
      title: "First conversation",
      updatedAt: new Date().toISOString(),
    },
  ],
  isFetchingNextPage: false,
  onSelect: jest.fn(),
  onNewChat: jest.fn(),
  onRename: jest.fn(),
  onDelete: jest.fn(),
  onClose: jest.fn(),
  search: "",
  onSearchChange: jest.fn(),
  activeConversationId: null,
};

beforeEach(() => {
  observers.length = 0;
  Reflect.set(globalThis, "IntersectionObserver", FakeIntersectionObserver);
  jest.clearAllMocks();
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(globalThis, "IntersectionObserver");
});

describe("KbConversationList sentinel", () => {
  it("calls onLoadMore when the sentinel scrolls into view instead of requiring a button click", () => {
    const onLoadMore = jest.fn();

    render(
      <KbConversationList
        {...baseProps}
        hasNextPage
        onLoadMore={onLoadMore}
      />,
    );

    expect(onLoadMore).not.toHaveBeenCalled();
    intersect();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("exposes an accessible load-more control with the sentinel label", () => {
    render(
      <KbConversationList
        {...baseProps}
        hasNextPage
        onLoadMore={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Load more conversations" })).toBeInTheDocument();
  });

  it("does not set up a sentinel observer when there is no next page", () => {
    render(
      <KbConversationList
        {...baseProps}
        hasNextPage={false}
        onLoadMore={jest.fn()}
      />,
    );

    expect(observers).toHaveLength(0);
  });
});
