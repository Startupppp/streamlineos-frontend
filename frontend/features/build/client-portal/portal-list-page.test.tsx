import { render, screen } from "@testing-library/react";
import { PortalListPage } from "./portal-list-page";
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

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "pm-fill-panel",
  PM_PANEL: "pm-panel",
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/lib/motion-presets", () => ({
  listItem: {},
  listItemReduced: {},
  pmSnappy: {},
}));

const mockUsePortalProjects = jest.fn();
const mockUseAccess = jest.fn();

jest.mock("@/hooks/api/build/client-portal", () => ({
  usePortalProjects: () => mockUsePortalProjects(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
  useAccess: () => mockUseAccess(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

const ACCESS_GRANTED = {
  data: {
    isOrgOwner: false,
    scopes: { "build:portal:view": "all" },
    modules: {},
  },
  isLoading: false,
};

const ACCESS_LOADING = {
  data: undefined,
  isLoading: true,
};

const ACCESS_DENIED = {
  data: {
    isOrgOwner: false,
    scopes: {},
    modules: {},
  },
  isLoading: false,
};

function baseQueryResult(overrides = {}) {
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
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUsePortalProjects.mockReturnValue(baseQueryResult({ data: [] }));
});

describe("PortalListPage — page state correctness", () => {
  it("shows the skeleton while the access snapshot is still loading and not the empty state because denial-is-not-emptiness", () => {
    mockUseAccess.mockReturnValue(ACCESS_LOADING);
    mockUsePortalProjects.mockReturnValue(baseQueryResult());
    render(<PortalListPage />);
    expect(screen.queryByText(/No projects/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("renders the upgrade link the backend sent with a 402 MODULE_NOT_ENABLED error instead of a generic failure message", () => {
    mockUseAccess.mockReturnValue(ACCESS_GRANTED);
    mockUsePortalProjects.mockReturnValue(
      baseQueryResult({
        isError: true,
        error: new ApiError("Build module is not enabled", 402, "MODULE_NOT_ENABLED", {
          moduleKey: "build",
          reason: "not-in-plan",
          upgradePath: "/settings/billing",
        }),
      }),
    );
    render(<PortalListPage />);
    expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /plan|billing|upgrade/i }),
    ).toHaveAttribute("href", "/settings/billing");
  });

  it("shows Access Restricted and not the No projects empty state when access is revoked so a denied employee is not misled", () => {
    mockUseAccess.mockReturnValue(ACCESS_DENIED);
    mockUsePortalProjects.mockReturnValue(baseQueryResult());
    render(<PortalListPage />);
    expect(screen.queryByText(/No projects/i)).not.toBeInTheDocument();
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders the project grid when data is present and access is granted", () => {
    mockUseAccess.mockReturnValue(ACCESS_GRANTED);
    mockUsePortalProjects.mockReturnValue(
      baseQueryResult({
        data: [
          {
            id: 1,
            name: "Alpha Project",
            key: "ALP",
            status: "active",
            color: null,
            startDate: null,
            targetEndDate: null,
          },
        ],
      }),
    );
    render(<PortalListPage />);
    expect(screen.getByText("Alpha Project")).toBeInTheDocument();
    expect(screen.queryByText(/No projects/i)).not.toBeInTheDocument();
  });
});
