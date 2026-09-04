import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryKeys } from "@/lib/query-keys";
import { MailShell } from "./mail-shell";
import { MailReadingPane } from "./mail-reading-pane";
import type { MailMessageDetail, MailMessageSummary } from "@/types/mail";

const LIST_ROW: MailMessageSummary = {
  id: "msg-1",
  threadId: "thread-1",
  accountId: 7,
  provider: "gmail",
  from: { name: "Sender", email: "sender@example.com" },
  to: [],
  subject: "Quarterly plan",
  snippet: "A snippet",
  date: "2026-02-01T10:00:00.000Z",
  isRead: true,
  isStarred: false,
  hasAttachments: false,
};

const SEEDED_DETAIL: MailMessageDetail = {
  ...LIST_ROW,
  cc: [],
  bodyHtml: null,
  bodyText: null,
  attachments: [],
};

let threadResult: {
  data: MailMessageDetail[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
  usePermissionGate: (key: string) => ({
    permission: key,
    allowed: key === "mail:inbox:view",
    denied: key !== "mail:inbox:view",
    pending: false,
  }),
}));

jest.mock("@/hooks/api/integrations", () => ({
  useFinalizeIntegrationConnection: () => ({ mutate: jest.fn() }),
  useIntegrationConnections: () => ({
    data: [],
    isError: false,
    isLoading: false,
    refetch: jest.fn(),
  }),
  useInitiateIntegrationConnection: () => ({ mutateAsync: jest.fn() }),
  useDisconnectIntegration: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useSetPrimaryIntegration: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock("@/hooks/api/mail", () => ({
  useMailAccounts: () => ({
    data: [
      {
        id: 7,
        provider: "gmail",
        accountEmail: "me@example.com",
        accountLabel: null,
        status: "active",
        isPrimary: true,
      },
    ],
    isLoading: false,
  }),
  useMailAction: () => ({ mutate: jest.fn(), isPending: false }),
  useMailMessages: () => ({
    data: { pages: [{ messages: [LIST_ROW], nextCursor: null, accountErrors: [] }] },
    isLoading: false,
    isError: false,
    error: null,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
  useMailThread: () => threadResult,
  useMailMessage: () => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useMailThreadSummary: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useMailAiDraft: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSendMail: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useReplyMail: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useMailInboxSummary: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
    reset: jest.fn(),
  }),
}));

function renderShell() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MailShell />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

function renderReadingPane() {
  return render(
    <TooltipProvider>
      <MailReadingPane selectedMessage={LIST_ROW} onReply={jest.fn()} />
    </TooltipProvider>,
  );
}

describe("MailShell — opening a message seeds the thread cache", () => {
  beforeEach(() => {
    threadResult = {
      data: undefined,
      isLoading: true,
      isFetching: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    };
  });

  it("writes the list row into the thread key so the detail has something to render", () => {
    const queryClient = renderShell();

    expect(
      queryClient.getQueryData(queryKeys.mail.thread(7, "thread-1")),
    ).toBeUndefined();

    fireEvent.click(screen.getByText("Quarterly plan"));

    expect(queryClient.getQueryData(queryKeys.mail.thread(7, "thread-1"))).toEqual([
      SEEDED_DETAIL,
    ]);
  });

  it("marks the seeded entry as already expired so the background refresh runs", () => {
    const queryClient = renderShell();
    fireEvent.click(screen.getByText("Quarterly plan"));

    const state = queryClient.getQueryState(queryKeys.mail.thread(7, "thread-1"));
    expect(state?.dataUpdatedAt).toBe(0);
  });
});

describe("MailReadingPane — a seeded thread renders its chrome, not a full skeleton", () => {
  it("shows the subject and a body placeholder while the real body is still in flight", () => {
    threadResult = {
      data: [SEEDED_DETAIL],
      isLoading: false,
      isFetching: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    };

    renderReadingPane();

    expect(screen.getByText("Quarterly plan")).toBeInTheDocument();
    expect(screen.getByTestId("mail-body-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("No content")).not.toBeInTheDocument();
  });

  it("a genuinely empty message says so once the fetch has settled", () => {
    threadResult = {
      data: [SEEDED_DETAIL],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    };

    renderReadingPane();

    expect(screen.getByText("No content")).toBeInTheDocument();
    expect(screen.queryByTestId("mail-body-skeleton")).not.toBeInTheDocument();
  });

  it("a hydrated body replaces the placeholder", () => {
    threadResult = {
      data: [{ ...SEEDED_DETAIL, bodyHtml: "<p>the real body</p>" }],
      isLoading: false,
      isFetching: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    };

    renderReadingPane();

    expect(screen.queryByTestId("mail-body-skeleton")).not.toBeInTheDocument();
    expect(screen.getByText("the real body")).toBeInTheDocument();
  });
});
