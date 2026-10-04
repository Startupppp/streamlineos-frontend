"use client";

import { render, screen, fireEvent } from "@testing-library/react";
import { ClientPortalManagementPage as PortalPage } from "./client-portal-management-page";

const mockIsApiError = jest.fn((_e: unknown): _e is { status: number } => false);
jest.mock("@/lib/api-envelope", () => ({
  isApiError: (e: unknown) => mockIsApiError(e),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

let currentSearch = new URLSearchParams();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useSearchParams: () => currentSearch,
  useRouter: () => ({ replace: mockReplace, refresh: jest.fn() }),
  usePathname: () => "/build/1/client-portal",
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmPanel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PM_ROW: "pm-row-class",
  PM_PANEL: "pm-panel-class",
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title?: string;
  }) => (
    <div>
      {title && <h1>{title}</h1>}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/page-tabs-toolbar", () => ({
  PageTabsToolbar: ({ tabs }: { tabs: React.ReactNode }) => <div>{tabs}</div>,
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  CONTENT_FILL_PANEL: "content-fill-panel-class",
}));

jest.mock("./client-visibility-page", () => ({
  ClientVisibilityPage: () => <div data-testid="visibility-page-stub" />,
}));

let capturedTabOnValueChange: ((v: string) => void) | undefined;

jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => {
    capturedTabOnValueChange = onValueChange;
    return <div data-active-tab={value}>{children}</div>;
  },
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div role="tablist">{children}</div>
  ),
  TabsTrigger: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => (
    <button
      role="tab"
      data-value={value}
      onClick={() => capturedTabOnValueChange?.(value)}
    >
      {children}
    </button>
  ),
  TabsContent: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-tab-content={value}>{children}</div>,
}));

jest.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    disabled,
    "aria-label": ariaLabel,
  }: {
    checked?: boolean;
    onCheckedChange?: (v: boolean) => void;
    disabled?: boolean;
    "aria-label"?: string;
  }) => (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
    />
  ),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    title,
    onConfirm,
    onOpenChange,
  }: {
    open?: boolean;
    title?: string;
    onConfirm?: () => void;
    onOpenChange?: (v: boolean) => void;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={() => onOpenChange?.(false)}>Cancel</button>
      </div>
    ) : null,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) =>
    e instanceof Error ? e.message : String(e),
}));

const mockUsePortalSettings = jest.fn();
const mockUsePublishPortal = jest.fn();
const mockUseUnpublishPortal = jest.fn();
const mockUsePortalPreview = jest.fn();
const mockUseProjectClientGrants = jest.fn();
const mockUseCan = jest.fn();
const mockRevokeMutate = jest.fn();
const mockUseRevokeGrant = jest.fn(
  (grantId: string): { mutate: jest.Mock; isPending: boolean; grantId: string } => ({
    mutate: mockRevokeMutate,
    isPending: false,
    grantId,
  }),
);
const mockUseOnlineStatus = jest.fn();
const mockUsePageState = jest.fn();

jest.mock("@/hooks/api/build/client-portal-management", () => ({
  usePortalSettings: () => mockUsePortalSettings(),
  usePublishPortal: () => mockUsePublishPortal(),
  useUnpublishPortal: () => mockUseUnpublishPortal(),
  usePortalPreview: () => mockUsePortalPreview(),
}));

jest.mock("@/hooks/api/portal-access/grants", () => ({
  useProjectClientGrants: (params?: unknown) => mockUseProjectClientGrants(params),
  useRevokeGrant: (grantId: string) => mockUseRevokeGrant(grantId),
}));

jest.mock("@/components/ui/table-pagination", () => ({
  TablePagination: ({
    pageNumber,
    hasMore,
    onNext,
    onPrevious,
  }: {
    pageNumber?: number;
    hasMore: boolean;
    onNext: () => void;
    onPrevious: () => void;
  }) => (
    <div data-testid="cursor-page-controls" data-page={pageNumber ?? 1}>
      <button type="button" onClick={onPrevious}>
        Previous
      </button>
      <button type="button" disabled={!hasMore} onClick={onNext}>
        Next
      </button>
    </div>
  ),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockUseCan(),
  useCanState: () => "allowed",
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => mockUsePageState(),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    children,
    resolution,
  }: {
    children: React.ReactNode;
    resolution: { kind: string };
    loading?: React.ReactNode;
    onRetry?: () => void;
  }) =>
    resolution.kind === "ready" ? <>{children}</> : null,
}));

function baseQuery(overrides = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

function baseMutation(overrides = {}) {
  return {
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    error: undefined,
    ...overrides,
  };
}

const UNPUBLISHED_SETTINGS = {
  portalPublishedAt: null,
  grantCount: 0,
};

const PUBLISHED_SETTINGS = {
  portalPublishedAt: "2024-06-01T00:00:00.000Z",
  grantCount: 2,
};

const SAMPLE_GRANT = {
  projectClientGrantId: "grant-abc-123",
  organizationId: "org-1",
  portalMembershipId: "mem-1",
  partyContactId: "contact-1",
  projectId: 1,
  canViewMilestones: true,
  canViewTasks: true,
  canViewAttachments: false,
  canViewComments: false,
  canSubmitChangeRequests: false,
  status: "ACTIVE" as const,
  expiresAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  contactFirstName: "Jane",
  contactLastName: "Smith",
};

const GRANTS_PAGE = {
  data: [SAMPLE_GRANT],
  pagination: { limit: 50, nextCursor: null, hasMore: false },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockIsApiError.mockReturnValue(false);
  currentSearch = new URLSearchParams();
  capturedTabOnValueChange = undefined;
  mockUseCan.mockReturnValue(true);
  mockUseOnlineStatus.mockReturnValue(true);
  mockUsePageState.mockReturnValue({ kind: "ready" });
  mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
  mockUseProjectClientGrants.mockReturnValue(baseQuery({ data: { data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } } }));
  mockUsePublishPortal.mockReturnValue(baseMutation());
  mockUseUnpublishPortal.mockReturnValue(baseMutation());
  mockUsePortalPreview.mockReturnValue(baseQuery({ data: { project: { id: 1, name: "P", key: "P", status: "active", startDate: null, targetEndDate: null }, milestones: [], tasks: [], attachments: [], comments: [] } }));
});

describe("ClientPortalManagementPage — publication state banner", () => {
  it("shows 'Portal not published' when portalPublishedAt is null", () => {
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByText("Portal not published")).toBeInTheDocument();
  });

  it("shows 'Portal published' when portalPublishedAt is set", () => {
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: PUBLISHED_SETTINGS }));
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByText("Portal published")).toBeInTheDocument();
  });

  it("NEGATIVE — 'Portal published' does not appear when portal is unpublished", () => {
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.queryByText("Portal published")).toBeNull();
  });
});

describe("ClientPortalManagementPage — Switch state reflects publication", () => {
  it("Switch is unchecked when portal is not published", () => {
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("Switch is checked when portal is published", () => {
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: PUBLISHED_SETTINGS }));
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("Switch is disabled when canManage is false so mutation control fails closed (FE-44)", () => {
    mockUseCan.mockReturnValue(false);
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("NEGATIVE — Switch is not disabled when canManage is true and nothing is pending", () => {
    mockUseCan.mockReturnValue(true);
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByRole("switch")).not.toBeDisabled();
  });
});

describe("ClientPortalManagementPage — publish flow", () => {
  it("clicking the Switch on an unpublished portal calls publishMutation.mutate immediately (no confirm)", () => {
    const publishMutate = jest.fn();
    mockUsePublishPortal.mockReturnValue(baseMutation({ mutate: publishMutate }));
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(publishMutate).toHaveBeenCalledTimes(1);
  });

  it("NEGATIVE — unpublishMutation.mutate is not called when publishing (no confirm dialog appears)", () => {
    const unpublishMutate = jest.fn();
    mockUseUnpublishPortal.mockReturnValue(baseMutation({ mutate: unpublishMutate }));
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(unpublishMutate).not.toHaveBeenCalled();
  });
});

describe("ClientPortalManagementPage — unpublish confirms destructively", () => {
  it("clicking Switch on a published portal opens the ConfirmDialog (destructive path)", () => {
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: PUBLISHED_SETTINGS }));
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("confirming unpublish calls unpublishMutation.mutate", () => {
    const unpublishMutate = jest.fn();
    mockUseUnpublishPortal.mockReturnValue(baseMutation({ mutate: unpublishMutate }));
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: PUBLISHED_SETTINGS }));
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByText("Confirm"));
    expect(unpublishMutate).toHaveBeenCalledTimes(1);
  });

  it("NEGATIVE — cancelling the confirm dialog does not call unpublishMutation.mutate", () => {
    const unpublishMutate = jest.fn();
    mockUseUnpublishPortal.mockReturnValue(baseMutation({ mutate: unpublishMutate }));
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: PUBLISHED_SETTINGS }));
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(unpublishMutate).not.toHaveBeenCalled();
  });
});

describe("ClientPortalManagementPage — grants tab", () => {
  it("shows 'No grants' empty state when grant list is empty", () => {
    mockUseProjectClientGrants.mockReturnValue(
      baseQuery({ data: { data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } } }),
    );
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getAllByText("No grants").length).toBeGreaterThan(0);
  });

  it("shows grant contact name when grants exist", () => {
    mockUseProjectClientGrants.mockReturnValue(baseQuery({ data: GRANTS_PAGE }));
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("opens the shortcut help dialog when ? is pressed, so the shortcut has a target instead of setting dead state", () => {
    mockUseProjectClientGrants.mockReturnValue(baseQuery({ data: GRANTS_PAGE }));
    render(<PortalPage projectId={1} />);

    expect(screen.queryByText("Keyboard shortcuts")).toBeNull();
    fireEvent.keyDown(document, { key: "?" });
    expect(screen.getByText("Keyboard shortcuts")).toBeInTheDocument();
  });

  it("offers a revoke control on an active grant when the viewer holds build:clientvisibility:manage", () => {
    mockUseCan.mockReturnValue(true);
    mockUseProjectClientGrants.mockReturnValue(baseQuery({ data: GRANTS_PAGE }));
    render(<PortalPage projectId={1} />);
    expect(screen.getByRole("button", { name: "Revoke" })).toBeInTheDocument();
  });

  it("NEGATIVE — offers no revoke control when the viewer lacks build:clientvisibility:manage, so the control fails closed (FE-44)", () => {
    mockUseCan.mockReturnValue(false);
    mockUseProjectClientGrants.mockReturnValue(baseQuery({ data: GRANTS_PAGE }));
    render(<PortalPage projectId={1} />);
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke" })).toBeNull();
  });

  it("NEGATIVE — offers no revoke control on an already revoked grant, because revoking twice is not an action", () => {
    mockUseCan.mockReturnValue(true);
    mockUseProjectClientGrants.mockReturnValue(
      baseQuery({
        data: {
          ...GRANTS_PAGE,
          data: [{ ...SAMPLE_GRANT, status: "REVOKED" }],
        },
      }),
    );
    render(<PortalPage projectId={1} />);
    expect(screen.queryByRole("button", { name: "Revoke" })).toBeNull();
  });

  it("confirms through a destructive ConfirmDialog before revoking, and does not revoke on the click alone (FE-83)", () => {
    mockUseCan.mockReturnValue(true);
    mockUseProjectClientGrants.mockReturnValue(baseQuery({ data: GRANTS_PAGE }));
    render(<PortalPage projectId={1} />);

    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    expect(mockRevokeMutate).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Revoke portal access?" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(mockRevokeMutate).toHaveBeenCalledTimes(1);
  });

  it("revokes the grant the row belongs to, not some other grant in the list", () => {
    mockUseCan.mockReturnValue(true);
    mockUseProjectClientGrants.mockReturnValue(baseQuery({ data: GRANTS_PAGE }));
    render(<PortalPage projectId={1} />);
    expect(mockUseRevokeGrant).toHaveBeenCalledWith(
      SAMPLE_GRANT.projectClientGrantId,
    );
  });

  it("NEGATIVE — grant name is absent when grants list is empty", () => {
    mockUseProjectClientGrants.mockReturnValue(
      baseQuery({ data: { data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } } }),
    );
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.queryByText("Jane Smith")).toBeNull();
  });
});

describe("ClientPortalManagementPage — error + loading states do not render banner content (FE-40)", () => {
  it("when page state is not ready, the publication banner is absent", () => {
    mockUsePageState.mockReturnValue({ kind: "error" });
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("NEGATIVE — when page state is ready, Switch is present", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });
});

describe("ClientPortalManagementPage — URL-backed grant filter axes (FE-86)", () => {
  function lastGrantParams() {
    const calls = mockUseProjectClientGrants.mock.calls;
    return calls[calls.length - 1]?.[0] as Record<string, unknown> | undefined;
  }

  it("sends no filter axis to the grants read when the URL carries none", () => {
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(lastGrantParams()).toEqual({
      projectId: 1,
      cursor: undefined,
      grantId: undefined,
      from: undefined,
      to: undefined,
      state: undefined,
    });
  });

  it("forwards grantId, from, to, status and cursor from the URL to the grants read", () => {
    currentSearch = new URLSearchParams(
      "grantId=grant-abc-123&from=2026-01-01&to=2026-06-30&status=active&cursor=cur-2",
    );
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(lastGrantParams()).toEqual({
      projectId: 1,
      cursor: "cur-2",
      grantId: "grant-abc-123",
      from: "2026-01-01",
      to: "2026-06-30",
      state: "active",
    });
  });

  it("drops an unknown status value rather than sending it, so a bookmarked URL cannot 400 the strict backend schema", () => {
    currentSearch = new URLSearchParams("status=NOT_A_STATE");
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(lastGrantParams()?.state).toBeUndefined();
  });

  it("distinguishes a filtered no-result state from first-run emptiness", () => {
    currentSearch = new URLSearchParams("status=revoked");
    mockUseProjectClientGrants.mockReturnValue(
      baseQuery({ data: { data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } } }),
    );
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getAllByText("No matching grants").length).toBeGreaterThan(0);
    expect(screen.queryByText("No grants")).toBeNull();
  });

  it("NEGATIVE — with no filter in the URL the empty state is the first-run one, not the filtered one", () => {
    mockUseProjectClientGrants.mockReturnValue(
      baseQuery({ data: { data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } } }),
    );
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getAllByText("No grants").length).toBeGreaterThan(0);
    expect(screen.queryByText("No matching grants")).toBeNull();
  });
});

describe("ClientPortalManagementPage — grants cursor pagination writes the URL", () => {
  it("advances by writing the next cursor into the URL rather than growing the mounted list (FE-125)", () => {
    mockUseProjectClientGrants.mockReturnValue(
      baseQuery({
        data: {
          data: [SAMPLE_GRANT],
          pagination: { limit: 50, nextCursor: "cur-next", hasMore: true },
        },
      }),
    );
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    fireEvent.click(screen.getByText("Next"));
    const target = mockReplace.mock.calls.at(-1)?.[0] as string;
    expect(target).toContain("cursor=cur-next");
  });

  it("NEGATIVE — Next is disabled on the last page, so there is no cursor write", () => {
    mockUseProjectClientGrants.mockReturnValue(baseQuery({ data: GRANTS_PAGE }));
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByText("Next")).toBeDisabled();
    fireEvent.click(screen.getByText("Next"));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("returns to the unpaged URL from page two, so Previous is recoverable on reload", () => {
    currentSearch = new URLSearchParams("cursor=cur-2");
    mockUseProjectClientGrants.mockReturnValue(
      baseQuery({
        data: {
          data: [SAMPLE_GRANT],
          pagination: { limit: 50, nextCursor: "cur-3", hasMore: true },
        },
      }),
    );
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByTestId("cursor-page-controls")).toHaveAttribute("data-page", "2");
    fireEvent.click(screen.getByText("Previous"));
    const target = mockReplace.mock.calls.at(-1)?.[0] as string;
    expect(target).not.toContain("cursor=");
  });

  it("renders no pager when there are no grants at all", () => {
    mockUseProjectClientGrants.mockReturnValue(
      baseQuery({ data: { data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } } }),
    );
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.queryByTestId("cursor-page-controls")).toBeNull();
  });
});

describe("ClientPortalManagementPage — tab navigation writes the section param (FE-86, BUG-047)", () => {
  it("clicking Visibility sets section=visibility in the URL so the tab survives a reload (FE-86 positive)", () => {
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    fireEvent.click(screen.getByRole("tab", { name: /Visibility/i }));
    const target = mockReplace.mock.calls.at(-1)?.[0] as string;
    expect(target).toContain("section=visibility");
    expect(target).not.toContain("section=grants");
  });

  it("NEGATIVE — clicking Grants removes the section param so the default tab has a clean URL (FE-86, BUG-047 negative)", () => {
    currentSearch = new URLSearchParams("section=visibility");
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    fireEvent.click(screen.getByRole("tab", { name: /Grants/i }));
    const target = mockReplace.mock.calls.at(-1)?.[0] as string;
    expect(target).not.toContain("section=");
    expect(target).not.toMatch(/\?$/);
  });

  it("clicking Preview sets section=preview and does not leave a trailing question mark", () => {
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    fireEvent.click(screen.getByRole("tab", { name: /Preview/i }));
    const target = mockReplace.mock.calls.at(-1)?.[0] as string;
    expect(target).toContain("section=preview");
    expect(target).not.toMatch(/\?$/);
  });

  it("active tab defaults to grants when the URL carries no section param", () => {
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    const activeTabEl = document.querySelector("[data-active-tab]");
    expect(activeTabEl?.getAttribute("data-active-tab")).toBe("grants");
  });

  it("active tab reflects section=preview from the URL on mount, so a deep-linked preview tab renders immediately", () => {
    currentSearch = new URLSearchParams("section=preview");
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    const activeTabEl = document.querySelector("[data-active-tab]");
    expect(activeTabEl?.getAttribute("data-active-tab")).toBe("preview");
  });
});

describe("ClientPortalManagementPage — client actor isolation: portal client cannot reach internal management (BT-716b46bf3292)", () => {
  it("hides the publication banner when pageState is denied so a portal-only actor cannot see the portal settings panel", () => {
    mockUsePageState.mockReturnValue({ kind: "denied" });
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.queryByText("Portal not published")).toBeNull();
    expect(screen.queryByText("Portal published")).toBeNull();
  });

  it("NEGATIVE — renders the publication banner when pageState is ready confirming the denied case is permission-specific and not a render bug", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByText("Portal not published")).toBeInTheDocument();
  });
});

describe("ClientPortalManagementPage — preview section 404 vs generic error (FE-78, FE-122)", () => {
  it("shows 'No portal published yet' when the preview returns a 404 (no active grant)", () => {
    const err = { status: 404 };
    mockIsApiError.mockImplementation((e) => e === err);
    mockUsePortalPreview.mockReturnValue(baseQuery({ isError: true, error: err }));
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByText("No portal published yet")).toBeInTheDocument();
  });

  it("NEGATIVE — shows 'Preview unavailable' for a non-404 API error, not the no-grant message", () => {
    const err = { status: 500 };
    mockIsApiError.mockImplementation((e) => e === err);
    mockUsePortalPreview.mockReturnValue(baseQuery({ isError: true, error: err }));
    const { ClientPortalManagementPage } = require("./client-portal-management-page");
    render(<ClientPortalManagementPage projectId={1} />);
    expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
    expect(screen.queryByText("No portal published yet")).toBeNull();
  });
});
