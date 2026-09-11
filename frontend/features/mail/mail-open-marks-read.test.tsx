import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MailShell } from "./mail-shell";
import type { MailMessageSummary } from "@/types/mail";

const mailActionMutate = jest.fn();
let canManageMail = true;

const unread: MailMessageSummary = {
  id: "msg-1",
  threadId: "thread-1",
  accountId: 7,
  provider: "gmail",
  from: { name: "Sender", email: "sender@example.com" },
  to: [],
  subject: "Quarterly plan",
  snippet: "A snippet",
  date: "2026-02-01T10:00:00.000Z",
  isRead: false,
  isStarred: false,
  hasAttachments: false,
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => (key === "mail:messages:manage" ? canManageMail : false),
  usePermissionGate: (key: string) => ({
    permission: key,
    allowed: key === "mail:inbox:view",
    denied: key !== "mail:inbox:view",
    pending: false,
  }),
}));

jest.mock("@/hooks/api/integrations", () => ({
  useFinalizeIntegrationConnection: () => ({ mutate: jest.fn() }),
  useIntegrationConnections: () => ({ data: [], isError: false, isLoading: false, refetch: jest.fn() }),
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
  useMailAction: () => ({ mutate: mailActionMutate, isPending: false }),
  useMailMessages: () => ({
    data: { pages: [{ messages: [unread], nextCursor: null, accountErrors: [] }] },
    isLoading: false,
    isError: false,
    error: null,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
  useMailThreadSummary: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useMailThread: () => ({ data: undefined, isLoading: true, isError: false, error: null, refetch: jest.fn() }),
  useSendMail: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useReplyMail: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useMailAiDraft: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useMailInboxSummary: () => ({ mutateAsync: jest.fn(), isPending: false, reset: jest.fn() }),
  useMailMessage: () => ({ data: undefined, isLoading: true, isError: false, error: null, refetch: jest.fn() }),
}));

function openTheMessage() {
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
  const row = screen.getByText("Quarterly plan");
  fireEvent.click(row);
}

describe("MailShell — opening a message marks it read", () => {
  beforeEach(() => {
    mailActionMutate.mockReset();
    canManageMail = true;
  });

  it("issues markRead for the opened message's own account and thread", () => {
    openTheMessage();

    expect(mailActionMutate).toHaveBeenCalledTimes(1);
    const call = mailActionMutate.mock.calls[0];
    expect(call?.[0]).toEqual({
      messageId: "msg-1",
      body: { accountId: 7, action: "markRead", threadId: "thread-1" },
    });
  });

  it("rolls the opened message back to unread when the server rejects the action", () => {
    openTheMessage();

    const options = mailActionMutate.mock.calls[0]?.[1];
    expect(typeof options?.onError).toBe("function");
    act(() => {
      options?.onError(new Error("nope"));
    });

    expect(mailActionMutate).toHaveBeenCalledTimes(1);
  });

  it("fires nothing when the reader cannot manage mail, so no 403 storm on open", () => {
    canManageMail = false;
    openTheMessage();

    expect(mailActionMutate).not.toHaveBeenCalled();
  });
});
