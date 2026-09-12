import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

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
  useCan: jest.fn(),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));

const { useCan } = jest.requireMock("@/hooks/api/access") as { useCan: jest.Mock };
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
  apiClient.get.mockImplementation(async (path: string) =>
    path.startsWith("/chat/channels")
      ? { channels: [], nextCursor: null }
      : [],
  );
});

describe("chat sidebar — denial is not emptiness", () => {
  it("without chat:channels:read it renders the shared denied surface, not 'No conversations yet'", async () => {
    useCan.mockReturnValue(false);
    await renderSidebar();

    expect(await screen.findByText("chat:channels:read")).toBeInTheDocument();
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByText("No conversations yet")).not.toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("an authorized reader with no channels still gets the empty surface", async () => {
    useCan.mockReturnValue(true);
    await renderSidebar();

    expect(await screen.findByText("No conversations yet")).toBeInTheDocument();
    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });
});
