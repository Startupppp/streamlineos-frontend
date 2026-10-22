import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";

const mockScopes: { current: Record<string, string> } = { current: {} };

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/chat",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: "org-1", user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  isApiError: () => false,
  getApiErrorCode: () => undefined,
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => key in mockScopes.current,
  useModuleEnabled: () => true,
  useAccess: () => ({
    data: { isOrgOwner: false, scopes: mockScopes.current, modules: {} },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/features/chat/channel-sidebar", () => ({
  ChannelSidebar: () => <div data-testid="channel-sidebar" />,
}));

jest.mock("@/features/chat/chat-ably-suite", () => ({
  ChatAblySuite: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock("@/features/chat/empty-chat-state", () => ({
  EmptyChatState: () => <div data-testid="empty-chat" />,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { get: jest.Mock };
};

async function renderPage() {
  const { ChatHomePage } = await import("./chat-home-page");
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ChatHomePage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockScopes.current = { "chat:channels:read": "all" };
});

describe("/chat page state — denial is not emptiness", () => {
  it("without chat:channels:read renders the denied surface and reads nothing", async () => {
    mockScopes.current = {};
    apiClient.get.mockResolvedValue({ channels: [], nextCursor: null });
    await act(async () => {
      await renderPage();
    });

    expect(screen.getByRole("heading", { name: "Access Restricted" })).toBeInTheDocument();
    expect(screen.queryByTestId("channel-sidebar")).toBeNull();
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("a permitted reader reaches the chat layout", async () => {
    apiClient.get.mockResolvedValue({ channels: [], nextCursor: null });
    await act(async () => {
      await renderPage();
    });

    expect(await screen.findByTestId("channel-sidebar")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Access Restricted" })).toBeNull();
  });
});

describe("/chat page state — a conversation read that never answers", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    apiClient.get.mockImplementation(() => new Promise(() => {}));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows the layout skeleton and says nothing for the first seconds", async () => {
    await act(async () => {
      await renderPage();
    });
    act(() => {
      jest.advanceTimersByTime(5_000);
    });

    expect(screen.getByRole("status", { name: "Loading chat" })).toBeInTheDocument();
    expect(screen.queryByText(/Still loading conversations/)).toBeNull();
  });

  it("offers copy and a Try again once the read has hung past the threshold", async () => {
    await act(async () => {
      await renderPage();
    });
    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    expect(screen.getByText(/Still loading conversations/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
