import { render, screen } from "@testing-library/react";
import { ClientVisibilityPage } from "./client-visibility-page";
import { PortalListPage } from "./portal-list-page";

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

const mockUseCan = jest.fn<boolean, [string]>(() => false);

jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => mockUseCan(permission),
}));

const mockUseClientVisibility = jest.fn();
const mockUseUpdateTicketVisibility = jest.fn();
const mockUseUpdateMilestoneVisibility = jest.fn();
const mockUsePortalProjects = jest.fn();
const mockUsePortalProjectOverview = jest.fn();

jest.mock("@/hooks/api/build/client-portal", () => ({
  useClientVisibility: (...args: [number]) => mockUseClientVisibility(...args),
  useUpdateTicketVisibility: (...args: [number]) => mockUseUpdateTicketVisibility(...args),
  useUpdateMilestoneVisibility: (...args: [number]) => mockUseUpdateMilestoneVisibility(...args),
  usePortalProjects: () => mockUsePortalProjects(),
  usePortalProjectOverview: (...args: [number]) => mockUsePortalProjectOverview(...args),
  usePortalChangeRequests: jest.fn(() => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
  useSubmitPortalChangeRequest: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

function noData() {
  return { data: undefined, isLoading: false, isError: false, refetch: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseClientVisibility.mockReturnValue(noData());
  mockUseUpdateTicketVisibility.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateMilestoneVisibility.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUsePortalProjects.mockReturnValue(noData());
  mockUsePortalProjectOverview.mockReturnValue(noData());
});

describe("BSN-03-052 — internal management and external portal identity separation", () => {
  describe("ClientVisibilityPage — internal management surface", () => {
    it("renders NoPermissionState when build:clientvisibility:manage is denied", () => {
      mockUseCan.mockReturnValue(false);
      render(<ClientVisibilityPage projectId={1} />);
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    });

    it("renders management content and calls the visibility hook when permission is granted", () => {
      mockUseCan.mockReturnValue(true);
      mockUseClientVisibility.mockReturnValue({
        data: { tickets: [], milestones: [] },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      render(<ClientVisibilityPage projectId={1} />);
      expect(mockUseClientVisibility).toHaveBeenCalledWith(1);
      expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
    });

    it("does not call any external portal data hook so internal preview cannot acquire portal-client data", () => {
      mockUseCan.mockReturnValue(true);
      mockUseClientVisibility.mockReturnValue({
        data: { tickets: [], milestones: [] },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      render(<ClientVisibilityPage projectId={1} />);
      expect(mockUsePortalProjectOverview).not.toHaveBeenCalled();
      expect(mockUsePortalProjects).not.toHaveBeenCalled();
    });

    it("— NEGATIVE — build:portal:view alone does not grant management access", () => {
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
      mockUsePortalProjects.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      render(<PortalListPage />);
      expect(screen.getByText(/No projects/i)).toBeInTheDocument();
    });

    it("does not call the internal management hook so an external client cannot access management data", () => {
      mockUsePortalProjects.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      render(<PortalListPage />);
      expect(mockUsePortalProjects).toHaveBeenCalled();
      expect(mockUseClientVisibility).not.toHaveBeenCalled();
      expect(mockUseUpdateTicketVisibility).not.toHaveBeenCalled();
      expect(mockUseUpdateMilestoneVisibility).not.toHaveBeenCalled();
    });

    it("— NEGATIVE — management permission alone yields no portal projects because the portal hook would be disabled", () => {
      mockUsePortalProjects.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      render(<PortalListPage />);
      expect(screen.getByText(/No projects/i)).toBeInTheDocument();
    });
  });
});
