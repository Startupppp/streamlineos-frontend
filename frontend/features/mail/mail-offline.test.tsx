import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MailListPane } from "./mail-list-pane";
import type { MailAccount } from "@/types/mail";

/**
 * `/inbox` has told the reader when the network is gone since it shipped;
 * `/mail` did not, so a disconnected mailbox rendered the transport's own error
 * text — "Failed to fetch" — in the place a reader looks for their messages.
 * That reads as a broken mailbox rather than a broken connection, and the
 * infinite list kept asking for a page that could not arrive.
 */

const fetchNextPage = jest.fn();

/** What `getErrorMessage` renders for a transport failure. */
const NETWORK_ERROR_TEXT = "Network error. Check your connection and try again.";

let listState = {
  pages: [] as Array<{ messages: unknown[]; nextCursor: string | null; accountErrors: unknown[] }>,
  isError: false,
  error: null as Error | null,
  hasNextPage: false,
};

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("@/hooks/api/mail", () => ({
  useMailMessages: () => ({
    data: { pages: listState.pages },
    isLoading: false,
    isError: listState.isError,
    error: listState.error,
    fetchNextPage,
    hasNextPage: listState.hasNextPage,
    isFetchingNextPage: false,
  }),
  useMailAction: () => ({ mutate: jest.fn(), isPending: false }),
  useMailThreadSummary: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const ACCOUNTS: MailAccount[] = [
  {
    id: 7,
    provider: "gmail",
    accountEmail: "me@example.com",
    accountLabel: null,
    status: "active",
    isPrimary: true,
  },
];

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => online,
  });
  fireEvent(window, new Event(online ? "online" : "offline"));
}

function renderPane() {
  return render(
    <TooltipProvider>
      <MailListPane
      selectedMessageId={null}
      selectedAccountId="all"
      onSelectMessage={jest.fn()}
      onOpenAccountsSheet={jest.fn()}
      accounts={ACCOUNTS}
      />
    </TooltipProvider>,
  );
}

describe("MailListPane — offline and reconnect", () => {
  beforeEach(() => {
    fetchNextPage.mockReset();
    listState = {
      pages: [{ messages: [], nextCursor: null, accountErrors: [] }],
      isError: false,
      error: null,
      hasNextPage: false,
    };
    setOnline(true);
  });

  afterEach(() => setOnline(true));

  it("BITE: says the reader is offline instead of showing them a transport error", () => {
    listState.isError = true;
    listState.error = new Error("Failed to fetch");
    renderPane();

    setOnline(false);

    expect(screen.getByText("You're offline")).toBeInTheDocument();
    expect(screen.queryByText(NETWORK_ERROR_TEXT)).toBeNull();
  });

  it("announces the offline state to assistive technology", () => {
    renderPane();

    setOnline(false);

    expect(
      screen.getByText("You are offline. Mail may be stale."),
    ).toBeInTheDocument();
  });

  it("warns that a list served from cache may be stale while offline", () => {
    renderPane();

    setOnline(false);

    expect(
      screen.getByText(/You're offline — mail may be stale/),
    ).toBeInTheDocument();
  });

  it("shows no offline chrome, and the real error, while online", () => {
    listState.isError = true;
    listState.error = new Error("Failed to fetch");
    renderPane();

    expect(screen.queryByText("You're offline")).toBeNull();
    expect(screen.getByText(NETWORK_ERROR_TEXT)).toBeInTheDocument();
  });

  it("does not spend the infinite list's load-more on a page that cannot arrive", () => {
    listState.pages = [
      {
        messages: [
          {
            id: "m1",
            threadId: "t1",
            accountId: 7,
            provider: "gmail",
            subject: "Cached before the tunnel",
            snippet: "",
            from: { email: "them@example.com", name: "Them" },
            date: "2026-01-01T00:00:00.000Z",
            isRead: true,
            isStarred: false,
            hasAttachments: false,
            folder: "inbox",
          },
        ],
        nextCursor: "c1",
        accountErrors: [],
      },
    ];
    listState.hasNextPage = true;
    renderPane();

    setOnline(false);
    fireEvent.click(screen.getByRole("button", { name: /load more/i }));
    expect(fetchNextPage).not.toHaveBeenCalled();

    setOnline(true);
    fireEvent.click(screen.getByRole("button", { name: /load more/i }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("reconnecting takes the offline state back down", () => {
    listState.isError = true;
    listState.error = new Error("Failed to fetch");
    renderPane();

    setOnline(false);
    expect(screen.getByText("You're offline")).toBeInTheDocument();

    setOnline(true);
    expect(screen.queryByText("You're offline")).toBeNull();
    expect(screen.getByText(NETWORK_ERROR_TEXT)).toBeInTheDocument();
  });
});
