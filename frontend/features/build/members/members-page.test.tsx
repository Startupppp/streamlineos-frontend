import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseAccess = jest.fn();
const mockUseCan = jest.fn();
const mockUseBuildMembers = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/build/settings/access",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => mockUseAccess(),
  useCan: () => mockUseCan(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: () => mockUseBuildMembers(),
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
  AddMemberButton: () => null,
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

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: ReactNode; title?: string }) => (
    <div>{title ? <h1>{title}</h1> : null}{children}</div>
  ),
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
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

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: ({ value: _v, onValueChange: _ov, ...props }: Record<string, unknown>) => (
    <input {...props as React.InputHTMLAttributes<HTMLInputElement>} />
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
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

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseCan.mockReturnValue(true);
  mockUseBuildMembers.mockReturnValue({
    data: { data: [], pagination: { hasMore: false, nextCursor: null } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
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
