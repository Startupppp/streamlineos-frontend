import type { ReactNode } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { Invitation, InvitationsListParams } from "@/hooks/api/users/types";

/**
 * A wrong contract in this repo renders as an EMPTY STATE, never as an error,
 * so "no invitations", "you may not read invitations" and "the read failed"
 * have to be three visibly different screens. Before this suite the denied case
 * fell through to the same `EmptyState` as a genuinely empty organisation: the
 * query was simply disabled, `data` stayed undefined and the panel invited the
 * viewer to invite their first teammate.
 */

let searchParams = new URLSearchParams();
const replace = jest.fn();
const push = jest.fn();

/**
 * The router object is created once, not per call. `useRouter` in Next returns a
 * stable reference, and the panel's `updateParams` is a `useCallback` keyed on
 * it; handing out a fresh object every render re-creates that callback, re-fires
 * the search-sync effect and spins the test forever against correct code.
 */
const router = { replace, push };

jest.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
  useRouter: () => router,
  usePathname: () => "/settings/users",
}));

let gate = { permission: "settings:organization:manage", allowed: true, denied: false, pending: false };
let canManageMembership = true;

jest.mock("@/hooks/api/access", () => ({
  usePermissionGate: () => gate,
  useCanManageOrganizationMembership: () => canManageMembership,
}));

interface InvitationsQueryState {
  data?: { data: Invitation[]; pagination: { limit: number; hasMore: boolean; nextCursor: string | null } };
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

let queryState: InvitationsQueryState = {
  data: { data: [], pagination: { limit: 20, hasMore: false, nextCursor: null } },
  isLoading: false,
  isError: false,
  error: null,
};

const useInvitations = jest.fn();
const refetch = jest.fn();

jest.mock("@/hooks/api/users", () => ({
  useInvitations: (params: InvitationsListParams) => {
    useInvitations(params);
    return { ...queryState, refetch };
  },
  useResendInvite: () => ({ mutate: jest.fn(), isPending: false, variables: undefined }),
  useReissueInvitationJoinLink: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
    variables: undefined,
  }),
  useCancelInvitation: () => ({ mutate: jest.fn(), isPending: false }),
  useChangeInvitationRole: () => ({ mutate: jest.fn(), isPending: false, variables: undefined }),
}));

jest.mock("./user-invite-dialog", () => ({
  UserInviteDialog: () => null,
}));

jest.mock("./people-section-tabs", () => ({
  PeopleSectionTabs: () => <div>tabs</div>,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, ...rest }: { children: ReactNode }) => (
    <button type="button" {...rest}>{children}</button>
  ),
  SelectValue: () => <span>status</span>,
}));

import { TooltipProvider } from "@/components/ui/tooltip";
import { UserInvitationsPanel } from "./user-invitations-panel";

function Panel() {
  return (
    <TooltipProvider>
      <UserInvitationsPanel />
    </TooltipProvider>
  );
}

function invitation(id: string, email: string): Invitation {
  return {
    id,
    email,
    role: "MEMBER",
    expiresAt: "2030-01-01T00:00:00.000Z",
    acceptedAt: null,
    createdAt: "2026-09-01T10:00:00.000Z",
    status: "PENDING",
    revokedAt: null,
    declinedAt: null,
    deliveryFailed: false,
  };
}

function lastRequestedParams(): InvitationsListParams {
  const calls = useInvitations.mock.calls;
  const last = calls[calls.length - 1]?.[0];
  if (!last) throw new Error("useInvitations was never called");
  return last as InvitationsListParams;
}

beforeEach(() => {
  searchParams = new URLSearchParams();
  replace.mockClear();
  refetch.mockClear();
  useInvitations.mockClear();
  canManageMembership = true;
  gate = { permission: "settings:organization:manage", allowed: true, denied: false, pending: false };
  queryState = {
    data: { data: [], pagination: { limit: 20, hasMore: false, nextCursor: null } },
    isLoading: false,
    isError: false,
    error: null,
  };
});

afterEach(cleanup);

describe("UserInvitationsPanel — empty, denied and failure are three distinct states", () => {
  it("renders the data-empty state when the organisation has no invitations", () => {
    render(<Panel />);

    expect(screen.getByText("No invitations yet")).toBeInTheDocument();
    expect(screen.queryByText("Failed to load invitations")).not.toBeInTheDocument();
    expect(screen.queryByText("Invitations are restricted")).not.toBeInTheDocument();
  });

  it("renders the filter-empty state, which is not the data-empty state", () => {
    searchParams = new URLSearchParams("q=nobody");
    render(<Panel />);

    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByText("No invitations match your filters.")).toBeInTheDocument();
    expect(screen.queryByText("No invitations yet")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("renders the denied state, never an empty list, when the permission is refused", () => {
    gate = {
      permission: "settings:organization:manage",
      allowed: false,
      denied: true,
      pending: false,
    };
    queryState = { data: undefined, isLoading: false, isError: false, error: null };

    render(<Panel />);

    expect(screen.getByText("Invitations are restricted")).toBeInTheDocument();
    expect(screen.getByText("settings:organization:manage")).toBeInTheDocument();
    expect(screen.queryByText("No invitations yet")).not.toBeInTheDocument();
    expect(screen.queryByText("No results")).not.toBeInTheDocument();
    expect(screen.queryByText("Failed to load invitations")).not.toBeInTheDocument();
  });

  it("renders the failure state with a retry, never an empty list, when the read fails", () => {
    queryState = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network request failed"),
    };

    render(<Panel />);

    expect(screen.getByText("Failed to load invitations")).toBeInTheDocument();
    expect(screen.queryByText("No invitations yet")).not.toBeInTheDocument();
    expect(screen.queryByText("Invitations are restricted")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders a loading skeleton, not an empty state, while the read is in flight", () => {
    queryState = { data: undefined, isLoading: true, isError: false, error: null };

    render(<Panel />);

    expect(screen.getByText("Loading results…")).toBeInTheDocument();
    expect(screen.queryByText("No invitations yet")).not.toBeInTheDocument();
  });

  it("renders a loading skeleton, not the denied state, while the permission is still resolving", () => {
    gate = {
      permission: "settings:organization:manage",
      allowed: false,
      denied: false,
      pending: true,
    };
    queryState = { data: undefined, isLoading: false, isError: false, error: null };

    render(<Panel />);

    expect(screen.getByText("Loading results…")).toBeInTheDocument();
    expect(screen.queryByText("Invitations are restricted")).not.toBeInTheDocument();
    expect(screen.queryByText("No invitations yet")).not.toBeInTheDocument();
  });
});

describe("UserInvitationsPanel — cursor pagination", () => {
  const PAGE_ONE = [invitation("inv-05", "e@example.com"), invitation("inv-04", "d@example.com")];

  function renderWithPageOne() {
    queryState = {
      data: { data: PAGE_ONE, pagination: { limit: 20, hasMore: true, nextCursor: "cursor-page-2" } },
      isLoading: false,
      isError: false,
      error: null,
    };
    return render(<Panel />);
  }

  it("asks for no cursor on the first page and disables Previous", () => {
    renderWithPageOne();

    expect(lastRequestedParams().cursor).toBeUndefined();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
  });

  it("Next sends the server's nextCursor, and Previous returns to the first page", () => {
    renderWithPageOne();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(lastRequestedParams().cursor).toBe("cursor-page-2");
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(lastRequestedParams().cursor).toBeUndefined();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });

  it("walks more than two pages forward, each on the cursor the previous page returned", () => {
    const { rerender } = renderWithPageOne();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(lastRequestedParams().cursor).toBe("cursor-page-2");

    queryState = {
      data: {
        data: [invitation("inv-03", "c@example.com"), invitation("inv-02", "b@example.com")],
        pagination: { limit: 20, hasMore: true, nextCursor: "cursor-page-3" },
      },
      isLoading: false,
      isError: false,
      error: null,
    };
    rerender(<Panel />);

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(lastRequestedParams().cursor).toBe("cursor-page-3");

    queryState = {
      data: {
        data: [invitation("inv-01", "a@example.com")],
        pagination: { limit: 20, hasMore: false, nextCursor: null },
      },
      isLoading: false,
      isError: false,
      error: null,
    };
    rerender(<Panel />);

    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
  });

  it("does not offer a page number or a total, because a keyset page has neither", () => {
    renderWithPageOne();

    expect(screen.queryByRole("button", { name: /^Page \d+$/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/of \d+ results/)).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "-1");
  });

  it("changing the status filter drops the cursor rather than replaying a stale one", () => {
    const { rerender } = renderWithPageOne();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(lastRequestedParams().cursor).toBe("cursor-page-2");

    searchParams = new URLSearchParams("status=accepted");
    rerender(<Panel />);

    expect(lastRequestedParams().cursor).toBeUndefined();
    expect(lastRequestedParams().status).toBe("accepted");
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });

  it("changing the search query drops the cursor rather than replaying a stale one", () => {
    const { rerender } = renderWithPageOne();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(lastRequestedParams().cursor).toBe("cursor-page-2");

    searchParams = new URLSearchParams("q=alice");
    rerender(<Panel />);

    expect(lastRequestedParams().cursor).toBeUndefined();
    expect(lastRequestedParams().q).toBe("alice");
  });

  it("changing the page size drops the cursor rather than replaying a stale one", () => {
    const { rerender } = renderWithPageOne();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(lastRequestedParams().cursor).toBe("cursor-page-2");

    searchParams = new URLSearchParams("size=50");
    rerender(<Panel />);

    expect(lastRequestedParams().cursor).toBeUndefined();
    expect(lastRequestedParams().limit).toBe(50);
  });
});

describe("UserInvitationsPanel — per-row actions carry row-specific names", () => {
  it("names each row action after the address it acts on", () => {
    queryState = {
      data: {
        data: [invitation("inv-1", "alice@example.com"), invitation("inv-2", "bob@example.com")],
        pagination: { limit: 20, hasMore: false, nextCursor: null },
      },
      isLoading: false,
      isError: false,
      error: null,
    };

    render(<Panel />);

    expect(
      screen.getByRole("button", { name: "Resend invitation to alice@example.com" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Resend invitation to bob@example.com" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel invitation to alice@example.com" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Role for bob@example.com" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Actions" })).not.toBeInTheDocument();
  });

  it("offers no row actions at all to a viewer who cannot manage membership", () => {
    canManageMembership = false;
    queryState = {
      data: {
        data: [invitation("inv-1", "alice@example.com")],
        pagination: { limit: 20, hasMore: false, nextCursor: null },
      },
      isLoading: false,
      isError: false,
      error: null,
    };

    render(<Panel />);

    expect(
      screen.queryByRole("button", { name: "Resend invitation to alice@example.com" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel invitation to alice@example.com" }),
    ).not.toBeInTheDocument();
  });
});
