import { render, screen } from "@testing-library/react";
import { ClientVisibilityPage } from "./client-visibility-page";
import { PortalListPage } from "./portal-list-page";
import { PortalDashboardPage } from "./portal-dashboard-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_ROW: "pm-row-class",
  PM_PANEL: "pm-panel-class",
  PM_FILL_PANEL: "pm-fill-panel-class",
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ScrollBar: () => null,
}));

jest.mock("@/components/ui/page-tabs-toolbar", () => ({
  PageTabsToolbar: ({
    tabs,
    children,
  }: {
    tabs: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div>
      {tabs}
      {children}
    </div>
  ),
}));

jest.mock("@/lib/motion-presets", () => ({
  listItem: {},
  listItemReduced: {},
  pmSnappy: {},
  fadeUp: {},
  fadeUpReduced: {},
  pmStagger: {},
}));

jest.mock("@animateicons/react/lucide", () => ({
  DownloadIcon: ({ ref: _ref, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <span {...props} />
  ),
  PlusIcon: ({ ref: _ref, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <span {...props} />
  ),
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({
    children,
    onClick,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("./portal-cr-sheet", () => ({
  PortalCrSheet: () => null,
}));

const mockUseCan = jest.fn<boolean, [string]>(() => false);
const mockUseAccess = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => mockUseCan(permission),
  useAccess: () => mockUseAccess(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

const mockUseClientVisibility = jest.fn();
const mockUseUpdateTicketVisibility = jest.fn();
const mockUseUpdateMilestoneVisibility = jest.fn();
const mockUsePortalProjects = jest.fn();
const mockUsePortalProjectOverview = jest.fn();
const mockUsePortalChangeRequests = jest.fn();

jest.mock("@/hooks/api/build/client-portal", () => ({
  useClientVisibility: (...args: [number]) => mockUseClientVisibility(...args),
  useUpdateTicketVisibility: (...args: [number]) => mockUseUpdateTicketVisibility(...args),
  useUpdateMilestoneVisibility: (...args: [number]) => mockUseUpdateMilestoneVisibility(...args),
  usePortalProjects: () => mockUsePortalProjects(),
  usePortalProjectOverview: (...args: [number]) => mockUsePortalProjectOverview(...args),
  usePortalChangeRequests: (...args: [number]) => mockUsePortalChangeRequests(...args),
  useSubmitPortalChangeRequest: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

const ACCESS_GRANTED_MANAGE = {
  data: {
    isOrgOwner: false,
    scopes: {
      "build:clientvisibility:manage": "all",
      "build:portal:view": "all",
    },
    modules: {},
  },
  isLoading: false,
};

const ACCESS_GRANTED_PORTAL_ONLY = {
  data: {
    isOrgOwner: false,
    scopes: { "build:portal:view": "all" },
    modules: {},
  },
  isLoading: false,
};

const ACCESS_DENIED = {
  data: {
    isOrgOwner: false,
    scopes: {},
    modules: {},
  },
  isLoading: false,
};

function noData() {
  return { data: undefined, isLoading: false, isError: false, error: undefined, refetch: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAccess.mockReturnValue(ACCESS_GRANTED_MANAGE);
  mockUseCan.mockReturnValue(true);
  mockUseClientVisibility.mockReturnValue(noData());
  mockUseUpdateTicketVisibility.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateMilestoneVisibility.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUsePortalProjects.mockReturnValue(noData());
  mockUsePortalProjectOverview.mockReturnValue(noData());
  mockUsePortalChangeRequests.mockReturnValue({ data: [], isLoading: false, isError: false, error: undefined, refetch: jest.fn() });
});

describe("BSN-03-052 — internal management and external portal identity separation", () => {
  describe("ClientVisibilityPage — internal management surface", () => {
    it("renders NoPermissionState when build:clientvisibility:manage is denied", () => {
      mockUseAccess.mockReturnValue(ACCESS_DENIED);
      mockUseCan.mockReturnValue(false);
      render(<ClientVisibilityPage projectId={1} />);
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    });

    it("renders management content and calls the visibility hook when permission is granted", () => {
      mockUseAccess.mockReturnValue(ACCESS_GRANTED_MANAGE);
      mockUseCan.mockReturnValue(true);
      mockUseClientVisibility.mockReturnValue({
        data: { tickets: [], milestones: [] },
        isLoading: false,
        isError: false,
        error: undefined,
        refetch: jest.fn(),
      });
      render(<ClientVisibilityPage projectId={1} />);
      expect(mockUseClientVisibility).toHaveBeenCalledWith(1);
      expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
    });

    it("does not call any external portal data hook so internal preview cannot acquire portal-client data", () => {
      mockUseAccess.mockReturnValue(ACCESS_GRANTED_MANAGE);
      mockUseCan.mockReturnValue(true);
      mockUseClientVisibility.mockReturnValue({
        data: { tickets: [], milestones: [] },
        isLoading: false,
        isError: false,
        error: undefined,
        refetch: jest.fn(),
      });
      render(<ClientVisibilityPage projectId={1} />);
      expect(mockUsePortalProjectOverview).not.toHaveBeenCalled();
      expect(mockUsePortalProjects).not.toHaveBeenCalled();
    });

    it("— NEGATIVE — build:portal:view alone does not grant management access", () => {
      mockUseAccess.mockReturnValue(ACCESS_GRANTED_PORTAL_ONLY);
      mockUseCan.mockImplementation(
        (permission: string) => permission === "build:portal:view",
      );
      render(<ClientVisibilityPage projectId={1} />);
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    });
  });

  describe("PortalListPage — external portal surface", () => {
    it("renders the empty state when no portal projects are returned so the client sees their granted scope only", () => {
      mockUseAccess.mockReturnValue(ACCESS_GRANTED_PORTAL_ONLY);
      mockUseCan.mockImplementation((p: string) => p === "build:portal:view");
      mockUsePortalProjects.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: undefined,
        refetch: jest.fn(),
      });
      render(<PortalListPage />);
      expect(screen.getByText(/No projects/i)).toBeInTheDocument();
    });

    it("does not call the internal management hook so an external client cannot access management data", () => {
      mockUseAccess.mockReturnValue(ACCESS_GRANTED_PORTAL_ONLY);
      mockUseCan.mockImplementation((p: string) => p === "build:portal:view");
      mockUsePortalProjects.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: undefined,
        refetch: jest.fn(),
      });
      render(<PortalListPage />);
      expect(mockUsePortalProjects).toHaveBeenCalled();
      expect(mockUseClientVisibility).not.toHaveBeenCalled();
      expect(mockUseUpdateTicketVisibility).not.toHaveBeenCalled();
      expect(mockUseUpdateMilestoneVisibility).not.toHaveBeenCalled();
    });

    it("— NEGATIVE — build:portal:view absent shows denial not emptiness, so an employee without the key cannot mistake absence of grants for an empty portal they are authorized to see", () => {
      mockUseAccess.mockReturnValue(ACCESS_DENIED);
      mockUseCan.mockReturnValue(false);
      mockUsePortalProjects.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        error: undefined,
        refetch: jest.fn(),
      });
      render(<PortalListPage />);
      expect(screen.queryByText(/No projects/i)).not.toBeInTheDocument();
      expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    });
  });

  describe("PortalDashboardPage — CR 402 propagation", () => {
    it("renders the upgrade link when the change-requests query alone returns a 402 MODULE_NOT_ENABLED error so the plan denial is not hidden by the overview query succeeding", () => {
      mockUseAccess.mockReturnValue(ACCESS_GRANTED_PORTAL_ONLY);
      mockUseCan.mockImplementation((p: string) => p === "build:portal:view");
      mockUsePortalProjectOverview.mockReturnValue(noData());
      mockUsePortalChangeRequests.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new ApiError("Build module not enabled", 402, "MODULE_NOT_ENABLED", {
          moduleKey: "build",
          reason: "not-in-plan",
          upgradePath: "/settings/billing",
        }),
        refetch: jest.fn(),
      });
      render(<PortalDashboardPage projectId={1} />);
      expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /plan|billing|upgrade/i }),
      ).toHaveAttribute("href", "/settings/billing");
    });
  });
});
