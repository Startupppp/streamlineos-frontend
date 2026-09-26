"use client";

import { render, screen, fireEvent } from "@testing-library/react";

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

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn(), refresh: jest.fn() }),
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

jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value?: string;
  }) => <div data-active-tab={value}>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div role="tablist">{children}</div>
  ),
  TabsTrigger: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <button role="tab" data-value={value}>{children}</button>,
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
const mockUseOnlineStatus = jest.fn();
const mockUsePageState = jest.fn();

jest.mock("@/hooks/api/build/client-portal-management", () => ({
  usePortalSettings: () => mockUsePortalSettings(),
  usePublishPortal: () => mockUsePublishPortal(),
  useUnpublishPortal: () => mockUseUnpublishPortal(),
  usePortalPreview: () => mockUsePortalPreview(),
}));

jest.mock("@/hooks/api/portal-access/grants", () => ({
  useProjectClientGrants: () => mockUseProjectClientGrants(),
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
