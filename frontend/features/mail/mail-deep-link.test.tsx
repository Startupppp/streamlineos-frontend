import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MailShell } from "./mail-shell";
import type { MailAccount, MailMessageSummary } from "@/types/mail";

let mockSearchParams = new URLSearchParams();
const replaceMock = jest.fn<void, [string, (Record<string, unknown> | undefined)?]>();
const mailActionMutate = jest.fn();
let canManageMail = true;

let capturedReadingPaneProps: { selectedMessage: MailMessageSummary } | null = null;

jest.mock("./mail-reading-pane", () => ({
  MailReadingPane: (props: { selectedMessage: MailMessageSummary }) => {
    capturedReadingPaneProps = props;
    return (
      <div
        data-testid="reading-pane"
        data-message-id={props.selectedMessage.id}
        data-account-id={String(props.selectedMessage.accountId)}
        data-thread-id={props.selectedMessage.threadId ?? ""}
      />
    );
  },
}));

jest.mock("./mail-accounts-sheet", () => ({
  MailAccountsSheet: () => <div data-testid="accounts-sheet" />,
}));

jest.mock("./mail-compose-sheet", () => ({
  MailComposeSheet: () => null,
}));

jest.mock("./mail-inbox-summary-sheet", () => ({
  MailInboxSummarySheet: () => null,
}));

jest.mock("./mail-shell-skeletons", () => ({
  MailReadingPaneSkeleton: () => null,
  MailSheetSkeleton: () => null,
}));

jest.mock("next/dynamic", () => {
  const React: typeof import("react") = require("react");
  return function mockDynamic(
    loader: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>,
  ) {
    const Lazy = React.lazy(loader);
    function DynamicWrapper(props: Record<string, unknown>) {
      return (
        <React.Suspense fallback={null}>
          <Lazy {...props} />
        </React.Suspense>
      );
    }
    return DynamicWrapper;
  };
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: jest.fn() }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => (key === "mail:messages:manage" ? canManageMail : false),
  usePermissionGate: (key: string) => ({
    permission: key,
    allowed: key === "mail:inbox:view",
    denied: false,
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

const ACCOUNT_ACTIVE: MailAccount = {
  id: 7,
  provider: "gmail",
  accountEmail: "me@example.com",
  accountLabel: null,
  status: "active",
  isPrimary: true,
};

const ACCOUNT_NEEDS_REAUTH: MailAccount = {
  ...ACCOUNT_ACTIVE,
  status: "needs_reauth",
};

let mockAccounts: MailAccount[] = [ACCOUNT_ACTIVE];

jest.mock("@/hooks/api/mail", () => ({
  useMailAccounts: () => ({ data: mockAccounts, isLoading: false }),
  useMailAction: () => ({ mutate: mailActionMutate, isPending: false }),
  useMailMessages: () => ({
    data: { pages: [{ messages: [], nextCursor: null, accountErrors: [] }] },
    isLoading: false,
    isError: false,
    error: null,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
  useMailThread: () => ({
    data: undefined,
    isLoading: true,
    isFetching: true,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useMailMessage: () => ({
    data: undefined,
    isLoading: true,
    isFetching: true,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useMailThreadSummary: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSendMail: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useReplyMail: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useMailAiDraft: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useMailInboxSummary: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
    reset: jest.fn(),
  }),
}));

function renderShell() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <MailShell />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return qc;
}

beforeEach(() => {
  mockSearchParams = new URLSearchParams();
  mockAccounts = [ACCOUNT_ACTIVE];
  capturedReadingPaneProps = null;
  canManageMail = true;
  replaceMock.mockReset();
  mailActionMutate.mockReset();
});

describe("MailShell — deep link opens the reading pane", () => {
  it("messageId deep link: reading pane receives the correct messageId and accountId", async () => {
    mockSearchParams = new URLSearchParams("accountId=7&messageId=abc");
    renderShell();

    const pane = await screen.findByTestId("reading-pane");
    expect(pane).toHaveAttribute("data-message-id", "abc");
    expect(pane).toHaveAttribute("data-account-id", "7");
    expect(pane).toHaveAttribute("data-thread-id", "");
  });

  it("threadId deep link: reading pane receives the correct threadId and accountId", async () => {
    mockSearchParams = new URLSearchParams("accountId=7&threadId=t-1");
    renderShell();

    const pane = await screen.findByTestId("reading-pane");
    expect(pane).toHaveAttribute("data-thread-id", "t-1");
    expect(pane).toHaveAttribute("data-account-id", "7");
  });

  it("threadId wins over messageId when both are supplied", async () => {
    mockSearchParams = new URLSearchParams("accountId=7&messageId=abc&threadId=t-1");
    renderShell();

    const pane = await screen.findByTestId("reading-pane");
    expect(pane).toHaveAttribute("data-thread-id", "t-1");
    expect(pane).toHaveAttribute("data-message-id", "t-1");
  });

  it("CONTROL: no deep link params leaves the reading pane unmounted", () => {
    mockSearchParams = new URLSearchParams();
    renderShell();

    expect(screen.queryByTestId("reading-pane")).toBeNull();
  });
});

describe("MailShell — deep link marks the message read", () => {
  it("fires markRead for the deep-linked message", async () => {
    mockSearchParams = new URLSearchParams("accountId=7&messageId=abc");
    renderShell();

    await screen.findByTestId("reading-pane");

    expect(mailActionMutate).toHaveBeenCalledTimes(1);
    const call = mailActionMutate.mock.calls[0][0];
    expect(call.messageId).toBe("abc");
    expect(call.body.accountId).toBe(7);
    expect(call.body.action).toBe("markRead");
  });

  it("CONTROL: does not fire markRead when the actor cannot manage mail", async () => {
    canManageMail = false;
    mockSearchParams = new URLSearchParams("accountId=7&messageId=abc");
    renderShell();

    await screen.findByTestId("reading-pane");
    expect(mailActionMutate).not.toHaveBeenCalled();
  });
});

describe("MailShell — deep link with malformed or unowned accountId", () => {
  it("non-numeric accountId does not open the reading pane and does not crash", () => {
    mockSearchParams = new URLSearchParams("accountId=abc&messageId=xyz");
    renderShell();

    expect(screen.queryByTestId("reading-pane")).toBeNull();
    expect(mailActionMutate).not.toHaveBeenCalled();
  });

  it("negative accountId is rejected — reading pane stays unmounted", () => {
    mockSearchParams = new URLSearchParams("accountId=-1&messageId=xyz");
    renderShell();

    expect(screen.queryByTestId("reading-pane")).toBeNull();
  });

  it("zero accountId is rejected", () => {
    mockSearchParams = new URLSearchParams("accountId=0&messageId=xyz");
    renderShell();

    expect(screen.queryByTestId("reading-pane")).toBeNull();
  });

  it("empty accountId is rejected", () => {
    mockSearchParams = new URLSearchParams("accountId=&messageId=xyz");
    renderShell();

    expect(screen.queryByTestId("reading-pane")).toBeNull();
  });

  it("accountId not in the actor's accounts renders the not-found state, not a spinner", async () => {
    mockAccounts = [ACCOUNT_ACTIVE];
    mockSearchParams = new URLSearchParams("accountId=99&messageId=xyz");
    renderShell();

    await waitFor(() => {
      expect(screen.getByText("Message not found")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("reading-pane")).toBeNull();
    expect(mailActionMutate).not.toHaveBeenCalled();
  });

  it("CONTROL: an owned accountId does not render the not-found state", async () => {
    mockSearchParams = new URLSearchParams("accountId=7&messageId=abc");
    renderShell();

    await screen.findByTestId("reading-pane");
    expect(screen.queryByText("Message not found")).toBeNull();
  });
});

describe("MailShell — deep link with needs_reauth account", () => {
  it("shows the reconnect affordance and opens the accounts sheet", async () => {
    mockAccounts = [ACCOUNT_NEEDS_REAUTH];
    mockSearchParams = new URLSearchParams("accountId=7&messageId=xyz");
    renderShell();

    await waitFor(() => {
      expect(screen.getByText("Reconnect your inbox")).toBeInTheDocument();
    });
    expect(await screen.findByTestId("accounts-sheet")).toBeInTheDocument();
    expect(screen.queryByTestId("reading-pane")).toBeNull();
    expect(mailActionMutate).not.toHaveBeenCalled();
  });

  it("CONTROL: an active account with a valid deep link does not show the reconnect state", async () => {
    mockSearchParams = new URLSearchParams("accountId=7&messageId=abc");
    renderShell();

    await screen.findByTestId("reading-pane");
    expect(screen.queryByText("Reconnect your inbox")).toBeNull();
  });
});

describe("MailShell — URL stays in sync after deep link consumption", () => {
  it("messageId deep link: router.replace is called with messageId and accountId preserved", async () => {
    mockSearchParams = new URLSearchParams("accountId=7&messageId=abc");
    renderShell();

    await screen.findByTestId("reading-pane");

    const deepLinkReplaceCall = replaceMock.mock.calls.find(([url]) =>
      url.includes("messageId=abc"),
    );
    expect(deepLinkReplaceCall).toBeDefined();
    expect(deepLinkReplaceCall?.[0]).toContain("accountId=7");
    expect(deepLinkReplaceCall?.[1]).toMatchObject({ scroll: false });
  });

  it("threadId deep link: router.replace is called with threadId preserved, messageId absent", async () => {
    mockSearchParams = new URLSearchParams("accountId=7&threadId=t-1");
    renderShell();

    await screen.findByTestId("reading-pane");

    const calls = replaceMock.mock.calls;
    const threadCall = calls.find(([url]) => url.includes("threadId=t-1"));
    expect(threadCall).toBeDefined();
    expect(threadCall?.[0]).not.toContain("messageId");
    expect(threadCall?.[1]).toMatchObject({ scroll: false });
  });
});
