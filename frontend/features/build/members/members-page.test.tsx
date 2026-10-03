import { render, screen, act } from "@testing-library/react";
import type { ReactNode } from "react";
import type { UseBuildListKeyboardOptions } from "@/hooks/common/use-build-list-keyboard";

const mockUseAccess = jest.fn();
const mockUseCan = jest.fn();
const mockUseBuildMembers = jest.fn();
const mockUseBuildListKeyboard = jest.fn((_options: UseBuildListKeyboardOptions) => ({
  focusedIndex: null,
  setFocusedIndex: jest.fn(),
}));
const mockUseOnlineStatus = jest.fn(() => true);
const mockUsePageState = jest.fn();

let mockSearchParamsValue = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/build/members",
  useSearchParams: () => mockSearchParamsValue,
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => mockUseAccess(),
  useCan: () => mockUseCan(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: (...args: unknown[]) => mockUseBuildMembers(...args),
  useRemoveBuildMember: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@tanstack/react-query", () => ({
  keepPreviousData: undefined,
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@/lib/person-display", () => ({
  getUserDisplayName: () => "Test User",
}));

jest.mock("@/features/build/members/pm-access-sheet", () => ({
  PmAccessButton: () => null,
}));

jest.mock("./display-props", () => ({
  loadDisplayProps: () => ({ showRole: true, showEmail: false }),
  saveDisplayProps: jest.fn(),
}));

jest.mock("./members-toolbar", () => ({
  DisplayPropsToggle: () => null,
}));

jest.mock("./add-member-dialog", () => ({
  AddMemberDialog: () => null,
}));

jest.mock("./use-members-columns", () => ({
  useMembersColumns: () => [],
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock("@/hooks/common/use-build-list-keyboard", () => ({
  useBuildListKeyboard: (options: UseBuildListKeyboardOptions) => mockUseBuildListKeyboard(options),
}));

jest.mock("@/components/shared/shortcut-help-dialog", () => ({
  ShortcutHelpDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="shortcut-help-dialog" /> : null,
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: ReactNode; title?: string }) => (
    <div>{title ? <h1>{title}</h1> : null}{children}</div>
  ),
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({ permission }: { permission?: string }) => (
    <div data-testid="no-permission">{permission}</div>
  ),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (opts: unknown) => mockUsePageState(opts),
}));

import { MembersPage } from "./members-page";

const ACCESS_LOADING = { data: undefined, isLoading: true };
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};
const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:members:view": "all" }, modules: {} },
  isLoading: false,
};

function idleMembers() {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

function resolvePageState(
  access: typeof ACCESS_GRANTED | typeof ACCESS_DENIED | typeof ACCESS_LOADING,
  opts: { isLoading: boolean; isError: boolean; isEmpty: boolean; error?: unknown },
) {
  if (access.isLoading) return { kind: "loading" as const };
  if (!access.data || !("build:members:view" in access.data.scopes))
    return { kind: "denied" as const, permission: "build:members:view" };
  if (opts.isLoading) return { kind: "loading" as const };
  if (opts.isError) return { kind: "error" as const, error: opts.error };
  if (opts.isEmpty) return { kind: "empty" as const };
  return { kind: "ready" as const };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParamsValue = new URLSearchParams();
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseCan.mockReturnValue(true);
  mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
  mockUseOnlineStatus.mockReturnValue(true);
  mockUseBuildMembers.mockReturnValue({
    data: { data: [], pagination: { hasMore: false, nextCursor: null } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  mockUsePageState.mockImplementation(
    (opts: { isLoading: boolean; isError: boolean; isEmpty: boolean; error?: unknown }) =>
      resolvePageState(mockUseAccess(), opts),
  );
});

describe("MembersPage — permission key (Criterion 3)", () => {
  it("passes the exact backend key build:members:view to usePageState — asserted not assumed", () => {
    render(<MembersPage />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:members:view" }),
    );
  });
});

describe("MembersPage — access is three-valued, not a boolean", () => {
  it("does not show an access-denied message while the access snapshot is still in flight", () => {
    mockUseAccess.mockReturnValue(ACCESS_LOADING);
    mockUseCan.mockReturnValue(false);
    mockUseBuildMembers.mockReturnValue(idleMembers());

    render(<MembersPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
    expect(screen.queryByTestId("no-permission")).toBeNull();
  });

  it("shows NoPermissionState when build:members:view resolves to denied, not an access-restricted EmptyState", () => {
    mockUseAccess.mockReturnValue(ACCESS_DENIED);
    mockUseCan.mockReturnValue(false);
    mockUseBuildMembers.mockReturnValue(idleMembers());

    render(<MembersPage />);

    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).toBeNull();
  });
});

describe("MembersPage — error state (BLD-X-FE-ACCESS-010)", () => {
  it("renders error state when the members fetch fails — not an empty or loading state", () => {
    mockUseAccess.mockReturnValue(ACCESS_GRANTED);
    mockUseCan.mockReturnValue(true);
    mockUseBuildMembers.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("fetch failed"),
      refetch: jest.fn(),
    });

    render(<MembersPage />);

    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
  });

  it("shows the data table when members load — confirming the error test is paired with a positive", () => {
    mockUseAccess.mockReturnValue(ACCESS_GRANTED);
    mockUseCan.mockReturnValue(true);
    mockUseBuildMembers.mockReturnValue({
      data: {
        data: [
          {
            id: "m1",
            userId: "u1",
            role: "MEMBER",
            email: "test@example.com",
            firstName: "Test",
            lastName: "User",
            image: null,
          },
        ],
        pagination: { hasMore: false, nextCursor: null },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<MembersPage />);

    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  });
});

describe("MembersPage — keyboard shortcut wiring (BLD-X-FE-ACCESS-011)", () => {
  it("passes onShortcutHelp to useBuildListKeyboard so the ? key can open the help overlay", () => {
    render(<MembersPage />);
    const lastCallArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(typeof lastCallArgs?.onShortcutHelp).toBe("function");
  });

  it("passes onCreate to useBuildListKeyboard so the c key opens the add member dialog", () => {
    render(<MembersPage />);
    const lastCallArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(typeof lastCallArgs?.onCreate).toBe("function");
  });

  it("ShortcutHelpDialog is not shown on initial render — paired with the open test below", () => {
    render(<MembersPage />);
    expect(screen.queryByTestId("shortcut-help-dialog")).not.toBeInTheDocument();
  });

  it("the onShortcutHelp callback passed to the keyboard hook opens the help dialog", async () => {
    render(<MembersPage />);
    const lastCallArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(typeof lastCallArgs?.onShortcutHelp).toBe("function");
    await act(async () => { lastCallArgs?.onShortcutHelp?.(); });
    expect(screen.getByTestId("shortcut-help-dialog")).toBeInTheDocument();
  });
});

describe("MembersPage — search URL param (BLD-X-FE-ACCESS-013)", () => {
  it("passes no search param when the URL has no search value — paired with the alice test below", () => {
    render(<MembersPage />);
    const lastArgs = mockUseBuildMembers.mock.calls.at(-1)?.[0] as { search?: string } | undefined;
    expect(lastArgs?.search).toBeUndefined();
  });

  it("passes the search value from the URL search param to useBuildMembers when search=alice is in the URL", () => {
    mockSearchParamsValue = new URLSearchParams("search=alice");
    render(<MembersPage />);
    const lastArgs = mockUseBuildMembers.mock.calls.at(-1)?.[0] as { search?: string } | undefined;
    expect(lastArgs?.search).toBe("alice");
  });
});

describe("MembersPage — offline state (BLD-X-FE-ACCESS-012)", () => {
  it("shows the offline empty state when useOnlineStatus returns false and the list is empty", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockUseBuildMembers.mockReturnValue({
      data: { data: [], pagination: { hasMore: false, nextCursor: null } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<MembersPage />);

    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });

  it("does not show the offline state when online and the list is empty — confirming the offline test is paired with a positive", () => {
    mockUseOnlineStatus.mockReturnValue(true);
    mockUseBuildMembers.mockReturnValue({
      data: { data: [], pagination: { hasMore: false, nextCursor: null } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<MembersPage />);

    expect(screen.queryByText(/you are offline/i)).toBeNull();
  });
});
