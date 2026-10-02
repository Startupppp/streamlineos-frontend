import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";

/**
 * CHAT-F-001 / CHAT-F-004. The sidebar's error branch is correct and sits above
 * the skeleton — but a read against an unreachable API holds `isLoading` for up to
 * ~61 seconds (a 30s request deadline, one retry, a 1s backoff) before `isError`
 * can turn true. The 2026-10-01 E2E waited 25s twice and filed it as an infinite
 * skeleton. This asserts the panel says something while the read is still in
 * flight, and that it does not say it early.
 */

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/chat",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
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
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {} }, refetch: jest.fn() })),
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { get: jest.Mock };
};

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function renderSidebar() {
  const { ChannelSidebar } = await import("@/features/chat/channel-sidebar");
  return render(
    <Wrapper>
      <ChannelSidebar
        activeChannelId={null}
        onSelectChannel={jest.fn()}
        currentUserId="user-1"
      />
    </Wrapper>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  // The outage shape: the request is accepted and never answers.
  apiClient.get.mockImplementation(() => new Promise(() => {}));
});

afterEach(() => {
  jest.useRealTimers();
});

describe("chat sidebar — a read that never answers", () => {
  it("says nothing for the first seconds of an ordinary slow read", async () => {
    await act(async () => {
      await renderSidebar();
    });

    act(() => {
      jest.advanceTimersByTime(5_000);
    });

    expect(screen.queryByText(/Still loading conversations/)).toBeNull();
  });

  it("offers copy and a Try again once the read has hung past the threshold", async () => {
    await act(async () => {
      await renderSidebar();
    });

    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    expect(screen.getByText(/Still loading conversations/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
