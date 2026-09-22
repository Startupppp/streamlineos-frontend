"use client";

import { render, screen } from "@testing-library/react";
import { ChangeRequestsPage } from "./change-requests-page";

const mockUseSearchParams = jest.fn(() => new URLSearchParams());
const mockRouterReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockUseSearchParams(),
  useRouter: () => ({ replace: mockRouterReplace }),
  usePathname: () => "/build/1/change-requests",
}));

jest.mock("@/hooks/api/build/change-requests", () => ({
  useChangeRequests: jest.fn(),
  useDeleteChangeRequest: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    filters,
    actions,
  }: {
    children: React.ReactNode;
    filters?: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      {filters}
      {actions}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: ({
    placeholder,
    value,
    onValueChange,
  }: {
    placeholder?: string;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      data-testid={`search-${placeholder?.replace(/[^a-z]/gi, "-").toLowerCase()}`}
    />
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value?: string;
  }) => (
    <div data-testid="status-select" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: ({ ref: _ref, ...props }: React.ComponentPropsWithRef<"span">) => (
    <span {...props} />
  ),
  EllipsisIcon: ({ ref: _ref, ...props }: React.ComponentPropsWithRef<"span">) => (
    <span {...props} />
  ),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("./change-request-sheet", () => ({
  ChangeRequestSheet: () => null,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PM_FILL_PANEL: "",
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  FILTER_TOOLBAR_ROW: "filter-toolbar-row",
}));

jest.mock("lucide-react", () => ({
  Lock: () => <span />,
  ShieldOff: () => <span />,
  Zap: () => <span />,
}));

import {
  useChangeRequests,
  useDeleteChangeRequest,
} from "@/hooks/api/build/change-requests";
import { useCan, useAccess } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";

const mockUseChangeRequests = useChangeRequests as jest.Mock;
const mockUseDeleteChangeRequest = useDeleteChangeRequest as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseOrgMembers = useOrgMembers as jest.Mock;

const ACCESS_GRANTED = {
  data: {
    isOrgOwner: false,
    scopes: { "build:changerequests:view": "all" },
    modules: {},
  },
  isLoading: false,
};

function baseQueryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSearchParams.mockReturnValue(new URLSearchParams());
  mockUseCan.mockReturnValue(false);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseChangeRequests.mockReturnValue(baseQueryResult({ data: [] }));
  mockUseDeleteChangeRequest.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  });
  mockUseOrgMembers.mockReturnValue(
    baseQueryResult({ data: { data: [] } }),
  );
});

describe("ChangeRequestsPage — URL state for status and impact filters", () => {
  describe("status filter", () => {
    it("calls useChangeRequests without filters when no status param is in the URL so an unfiltered page shows all change requests", () => {
      mockUseSearchParams.mockReturnValue(new URLSearchParams());
      render(<ChangeRequestsPage projectId={1} />);
      expect(mockUseChangeRequests).toHaveBeenCalledWith(1, undefined);
    });

    it("reads the status param from the URL and passes it to useChangeRequests so the filter survives navigation", () => {
      mockUseSearchParams.mockReturnValue(new URLSearchParams("status=approved"));
      render(<ChangeRequestsPage projectId={1} />);
      expect(mockUseChangeRequests).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: "approved" }),
      );
    });

    it("renders the status select with the URL value so the filter UI reflects deep-linked state", () => {
      mockUseSearchParams.mockReturnValue(new URLSearchParams("status=rejected"));
      render(<ChangeRequestsPage projectId={1} />);
      expect(screen.getByTestId("status-select")).toHaveAttribute(
        "data-value",
        "rejected",
      );
    });
  });

  describe("impact filter", () => {
    it("calls useChangeRequests without impact when the impact param is absent so no spurious filter is sent", () => {
      mockUseSearchParams.mockReturnValue(new URLSearchParams());
      render(<ChangeRequestsPage projectId={1} />);
      const call = mockUseChangeRequests.mock.calls[0];
      const filters = call[1] as Record<string, string> | undefined;
      expect(filters?.impact).toBeUndefined();
    });

    it("reads the impact param from the URL and passes it to useChangeRequests so backend-filtered impact results are returned", () => {
      mockUseSearchParams.mockReturnValue(new URLSearchParams("impact=High"));
      render(<ChangeRequestsPage projectId={1} />);
      expect(mockUseChangeRequests).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ impact: "High" }),
      );
    });

    it("shows the impact search input with the current URL value so the filter is visible to the user", () => {
      mockUseSearchParams.mockReturnValue(
        new URLSearchParams("impact=Critical"),
      );
      render(<ChangeRequestsPage projectId={1} />);
      const impactInput = screen.getByPlaceholderText(/impact/i);
      expect(impactInput).toHaveValue("Critical");
    });
  });

  describe("combined filters", () => {
    it("passes both status and impact to useChangeRequests when both params are present in the URL", () => {
      mockUseSearchParams.mockReturnValue(
        new URLSearchParams("status=submitted&impact=Medium"),
      );
      render(<ChangeRequestsPage projectId={1} />);
      expect(mockUseChangeRequests).toHaveBeenCalledWith(1, {
        status: "submitted",
        impact: "Medium",
      });
    });

    it("shows the filtered-empty empty state when both filters are active and no results match so the user knows to clear their filters", () => {
      mockUseSearchParams.mockReturnValue(
        new URLSearchParams("status=approved&impact=Low"),
      );
      mockUseChangeRequests.mockReturnValue(baseQueryResult({ data: [] }));
      render(<ChangeRequestsPage projectId={1} />);
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });
  });
});

describe("ChangeRequestsPage — URL state for q (server-side text search)", () => {
  it("calls useChangeRequests without q when the q param is absent so no spurious search filter is sent", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    render(<ChangeRequestsPage projectId={1} />);
    const call = mockUseChangeRequests.mock.calls[0];
    const filters = call[1] as Record<string, string> | undefined;
    expect(filters?.q).toBeUndefined();
  });

  it("reads the q param from the URL and passes it to useChangeRequests for server-side text search", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=foundation"));
    render(<ChangeRequestsPage projectId={1} />);
    expect(mockUseChangeRequests).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ q: "foundation" }),
    );
  });

  it("shows the search input populated with the q param value so the filter is visible", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=urgent+scope"));
    render(<ChangeRequestsPage projectId={1} />);
    const searchInput = screen.getByPlaceholderText(/Search/i);
    expect(searchInput).toHaveValue("urgent scope");
  });

  it("passes all three filters together when status, impact, and q are in the URL", () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams("status=submitted&impact=High&q=roof"),
    );
    render(<ChangeRequestsPage projectId={1} />);
    expect(mockUseChangeRequests).toHaveBeenCalledWith(1, {
      status: "submitted",
      impact: "High",
      q: "roof",
    });
  });
});
