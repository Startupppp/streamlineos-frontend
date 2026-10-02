import { render, screen } from "@testing-library/react";

const mockScopes: { current: Record<string, string> } = { current: {} };
const mockOrgUsers: { current: unknown } = { current: undefined };

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => key in mockScopes.current,
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

jest.mock("@/hooks/api", () => ({
  useChatOrgUsers: () => ({
    data: mockOrgUsers.current,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useCreateDMChannel: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

import { ChannelSidebarSearchResults } from "@/features/chat/channel-sidebar-search-results";

function renderPeopleSearch() {
  return render(
    <ChannelSidebarSearchResults
      scope="people"
      search=""
      channels={[]}
      activeChannelId={null}
      currentUserId="user-1"
      onlineUserIds={new Set()}
      onSelectChannel={jest.fn()}
    />,
  );
}

beforeEach(() => {
  mockScopes.current = {};
  mockOrgUsers.current = undefined;
});

describe("chat people search — denial is not emptiness", () => {
  it("tells a caller without chat:channels:read they lack access instead of that nobody is available to message", () => {
    renderPeopleSearch();

    expect(screen.getByRole("heading", { name: "Access Restricted" })).toBeInTheDocument();
    expect(screen.queryByText("No people found")).not.toBeInTheDocument();
  });

  it("still says no people were found to a caller holding chat:channels:read whose directory is empty", () => {
    mockScopes.current = { "chat:channels:read": "all" };
    mockOrgUsers.current = [];
    renderPeopleSearch();

    expect(screen.getByText("No people found")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Access Restricted" })).not.toBeInTheDocument();
  });

  it("lists the people a permitted caller can message", () => {
    mockScopes.current = { "chat:channels:read": "all" };
    mockOrgUsers.current = [{ id: "user-2", name: "Grace Hopper", email: "grace@example.com", image: null }];
    renderPeopleSearch();

    expect(screen.getByRole("list", { name: "People" })).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });
});
