import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MailAccountsSheet } from "./mail-accounts-sheet";
import { MailListPane } from "./mail-list-pane";
import type { IntegrationConnection } from "@/hooks/api/integrations";
import type { MailAccount } from "@/types/mail";

const initiateMutateAsync = jest.fn().mockResolvedValue({ redirectUrl: "https://provider/oauth" });
let connections: IntegrationConnection[] = [];

jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => false }));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("@/hooks/api/integrations", () => ({
  useIntegrationConnections: () => ({
    data: connections,
    isError: false,
    isLoading: false,
    refetch: jest.fn(),
  }),
  useInitiateIntegrationConnection: () => ({ mutateAsync: initiateMutateAsync }),
  useDisconnectIntegration: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useSetPrimaryIntegration: () => ({ mutateAsync: jest.fn() }),
}));

function renderSheet() {
  return render(
    <TooltipProvider>
      <MailAccountsSheet open onClose={jest.fn()} />
    </TooltipProvider>,
  );
}

const revoked: IntegrationConnection = {
  id: 7,
  toolkit: "gmail",
  accountEmail: "revoked@example.com",
  accountLabel: null,
  status: "needs_reauth",
  isPrimary: false,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const healthy: IntegrationConnection = {
  ...revoked,
  id: 8,
  accountEmail: "working@example.com",
  status: "active",
  isPrimary: true,
};

describe("MailAccountsSheet — a revoked account is recoverable, not silently broken", () => {
  beforeEach(() => {
    initiateMutateAsync.mockClear();
    connections = [revoked, healthy];
  });

  it("labels the revoked account for reconnection and leaves the healthy one connected", () => {
    renderSheet();

    expect(screen.getByText("revoked@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("Reconnect").length).toBeGreaterThan(0);
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("re-initiates the provider connection for the revoked account's own toolkit", () => {
    renderSheet();

    const buttons = screen.getAllByRole("button", { name: /reconnect/i });
    const reconnect = buttons[0];
    expect(reconnect).toBeDefined();
    if (reconnect) fireEvent.click(reconnect);

    expect(initiateMutateAsync).toHaveBeenCalledWith({ toolkit: "gmail", returnPath: "/mail" });
  });

  it("offers no reconnect control when every account is active", () => {
    connections = [healthy];
    renderSheet();

    expect(screen.queryByRole("button", { name: /reconnect/i })).toBeNull();
  });
});

const accountErrors = [
  { accountId: 7, accountEmail: "revoked@example.com", message: "Reauthentication required" },
];

let mailPages: Array<{
  messages: unknown[];
  nextCursor: string | null;
  accountErrors: typeof accountErrors;
}> = [];

jest.mock("@/hooks/api/mail", () => ({
  useMailMessages: () => ({
    data: { pages: mailPages },
    isLoading: false,
    isError: false,
    error: null,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
  useMailAction: () => ({ mutate: jest.fn(), isPending: false }),
  useMailThreadSummary: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const accounts: MailAccount[] = [
  {
    id: 7,
    provider: "gmail",
    accountEmail: "revoked@example.com",
    accountLabel: null,
    status: "needs_reauth",
    isPrimary: true,
  },
];

describe("MailListPane — a revoked account explains itself in the list", () => {
  beforeEach(() => {
    mailPages = [{ messages: [], nextCursor: null, accountErrors }];
  });

  it("surfaces the failing account, its reason, and a route back to reconnecting", () => {
    const onOpenAccountsSheet = jest.fn();
    render(
      <MailListPane
        selectedMessageId={null}
        selectedAccountId="all"
        onSelectMessage={jest.fn()}
        onOpenAccountsSheet={onOpenAccountsSheet}
        accounts={accounts}
      />,
    );

    expect(screen.getByText("revoked@example.com")).toBeInTheDocument();
    expect(screen.getByText("Reauthentication required")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reconnect" }));
    expect(onOpenAccountsSheet).toHaveBeenCalledTimes(1);
  });

  it("renders no error banner when every account answered", () => {
    mailPages = [{ messages: [], nextCursor: null, accountErrors: [] }];
    render(
      <MailListPane
        selectedMessageId={null}
        selectedAccountId="all"
        onSelectMessage={jest.fn()}
        onOpenAccountsSheet={jest.fn()}
        accounts={accounts}
      />,
    );

    expect(screen.queryByRole("button", { name: "Reconnect" })).toBeNull();
  });
});
