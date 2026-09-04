import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MailShell } from "./mail-shell";

let gate = { allowed: false, denied: true, pending: false };

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
  usePermissionGate: (key: string) => ({ permission: key, ...gate }),
}));

jest.mock("@/hooks/api/integrations", () => ({
  useFinalizeIntegrationConnection: () => ({ mutate: jest.fn() }),
  useIntegrationConnections: () => ({ data: [], isError: false, isLoading: false, refetch: jest.fn() }),
  useInitiateIntegrationConnection: () => ({ mutateAsync: jest.fn() }),
  useDisconnectIntegration: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useSetPrimaryIntegration: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock("@/hooks/api/mail", () => ({
  useMailAccounts: () => ({ data: undefined, isLoading: false }),
  useMailAction: () => ({ mutate: jest.fn(), isPending: false }),
  useMailMessages: () => ({
    data: undefined,
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
}

describe("/mail — a reader without mail:inbox:view", () => {
  afterEach(() => {
    gate = { allowed: false, denied: true, pending: false };
  });

  it("BITE: is refused, and is NOT told to connect an inbox", () => {
    renderShell();

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.getByText("mail:inbox:view")).toBeInTheDocument();
    expect(screen.queryByText("Connect your inbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /connect email/i })).toBeNull();
  });

  it("does not flash the refusal while the access snapshot is still pending", () => {
    gate = { allowed: false, denied: false, pending: true };
    renderShell();

    expect(screen.queryByText("Access Restricted")).toBeNull();
  });

  it("CONTROL: a permitted reader with no mailbox still gets the connect pane", () => {
    gate = { allowed: true, denied: false, pending: false };
    renderShell();

    expect(screen.queryByText("Access Restricted")).toBeNull();
    expect(screen.getByText("Connect your inbox")).toBeInTheDocument();
  });
});
