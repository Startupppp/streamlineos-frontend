import { render, screen } from "@testing-library/react";
import { BuildSidebar } from "./build-sidebar";
import { useBuildNavModel, useBuildNavView } from "./use-build-nav-model";
import { useBuildScopeIdentity } from "./use-build-scope-identity";
import { useBuildScopeRecovery } from "./use-build-scope-recovery";
import { useBuildNotificationUnreadCount } from "@/hooks/api/build/approvals";
import type { BuildNavModel } from "@/lib/build/nav/build-nav-destination";
import { ORGANIZATION_BUILD_SCOPE } from "@/lib/build/build-scope";
import type { BuildScopeRef } from "./use-build-nav-preferences";

jest.mock("next/navigation", () => ({
  usePathname: () => "/build",
}));
jest.mock("./use-build-nav-model");
jest.mock("./use-build-scope-identity");
jest.mock("./use-build-scope-recovery");
jest.mock("@/hooks/api/build/approvals");
jest.mock("./build-scope-selector", () => ({
  BuildScopeSelector: () => <div data-testid="scope-selector" />,
}));
jest.mock("./build-scope-recovery", () => ({
  BuildScopeRecovery: () => null,
}));
jest.mock("./build-sidebar-skeleton", () => ({
  BuildSidebarSkeleton: () => <div data-testid="sidebar-skeleton" />,
}));
jest.mock("./build-agent-pulse", () => ({
  BuildAgentPulse: () => null,
}));
jest.mock("./build-quick-create", () => ({
  BuildQuickCreate: () => null,
}));
jest.mock("./build-more-tools-menu", () => ({
  BuildMoreToolsMenu: () => null,
}));
jest.mock("./build-nav-link", () => ({
  BuildNavLink: ({ destination }: { destination: { label: string } }) => (
    <div data-testid="nav-link">{destination.label}</div>
  ),
}));

const mockUseBuildNavModel = useBuildNavModel as jest.MockedFunction<typeof useBuildNavModel>;
const mockUseBuildNavView = useBuildNavView as jest.MockedFunction<typeof useBuildNavView>;
const mockUseBuildScopeIdentity = useBuildScopeIdentity as jest.MockedFunction<typeof useBuildScopeIdentity>;
const mockUseBuildScopeRecovery = useBuildScopeRecovery as jest.MockedFunction<typeof useBuildScopeRecovery>;
const mockUseBuildNotificationUnreadCount = useBuildNotificationUnreadCount as jest.Mock;

const MOCK_ORG_REF: BuildScopeRef = {
  key: "organization",
  type: "organization",
  id: "organization",
  name: "Organization",
  parentPath: null,
  parentKey: null,
  projectKey: null,
  href: "/build",
};

function makeEmptyModel(): BuildNavModel {
  return {
    scope: ORGANIZATION_BUILD_SCOPE,
    myWork: [],
    primary: [],
    pinned: [],
    moreTools: [],
    settings: null,
    browseAll: null,
    createActions: [],
  };
}

function makeNonEmptyModel(): BuildNavModel {
  return {
    ...makeEmptyModel(),
    primary: [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "/build",
        icon: () => null,
        requiredPermission: "build:view",
      },
    ],
  };
}

function setupMocks(
  modelOverrides: Partial<BuildNavModel> = {},
  isAccessReady = true,
  accessErrorOverrides: {
    isAccessError?: boolean;
    refetchAccess?: () => void;
  } = {},
) {
  const model = { ...makeEmptyModel(), ...modelOverrides };
  mockUseBuildNavModel.mockReturnValue({
    model,
    isAccessReady,
    isAccessError: accessErrorOverrides.isAccessError ?? false,
    refetchAccess: accessErrorOverrides.refetchAccess ?? jest.fn(),
    isPinned: () => false,
    canPinMore: true,
    togglePin: jest.fn(),
  });
  mockUseBuildNavView.mockReturnValue(null);
  mockUseBuildScopeIdentity.mockReturnValue({
    ref: MOCK_ORG_REF,
    isLoading: false,
    isArchived: false,
    isInaccessible: false,
  });
  mockUseBuildScopeRecovery.mockReturnValue({ kind: "stay" });
  mockUseBuildNotificationUnreadCount.mockReturnValue({ data: undefined });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("BSN-04-A06 — zero accessible Build scopes shows the empty state rather than a broken selector", () => {
  test("a member with no accessible Build scopes sees an explanation instead of a blank selector", () => {
    setupMocks();
    render(<BuildSidebar isCollapsed={false} />);
    expect(screen.getByText("Build access required")).toBeInTheDocument();
    expect(screen.queryByTestId("scope-selector")).not.toBeInTheDocument();
  });

  test("loading state shows the skeleton and not the permission state so the user does not see a denied flash while access resolves", () => {
    setupMocks({}, false);
    render(<BuildSidebar isCollapsed={false} />);
    expect(screen.getByTestId("sidebar-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("Build access required")).not.toBeInTheDocument();
  });

  test("the collapsed icon rail keeps an accessible name and omits the prose, which a 3.5rem rail cannot fit", () => {
    setupMocks();
    render(<BuildSidebar isCollapsed />);
    expect(
      screen.getByRole("img", { name: "Build access required" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Ask your admin for access to Build features."),
    ).not.toBeInTheDocument();
  });

  test("the expanded state states the reason in prose rather than naming a raw permission key at the user", () => {
    setupMocks();
    render(<BuildSidebar isCollapsed={false} />);
    expect(
      screen.getByText("Ask your admin for access to Build features."),
    ).toBeInTheDocument();
    expect(screen.queryByText("build:view")).not.toBeInTheDocument();
  });

  test("when at least one Build destination is accessible the nav links render and no permission state appears", () => {
    setupMocks({ primary: makeNonEmptyModel().primary });
    render(<BuildSidebar isCollapsed={false} />);
    expect(screen.getByTestId("nav-link")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Build access required")).not.toBeInTheDocument();
  });
});

describe("BLD-X-SB-OFFLINE-001 — a failed access fetch surfaces an error, not an infinite skeleton or a false denial", () => {
  test("a failed access query shows a retryable error state instead of the permission-denied empty state", () => {
    setupMocks({}, false, { isAccessError: true });
    render(<BuildSidebar isCollapsed={false} />);
    expect(screen.getByText("Couldn't load Build navigation")).toBeInTheDocument();
    expect(screen.queryByText("Build access required")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sidebar-skeleton")).not.toBeInTheDocument();
  });

  test("a failed access query still shows the skeleton, not the error state, while isAccessReady is false but isAccessError has not yet flipped", () => {
    setupMocks({}, false, { isAccessError: false });
    render(<BuildSidebar isCollapsed={false} />);
    expect(screen.getByTestId("sidebar-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load Build navigation")).not.toBeInTheDocument();
  });

  test("clicking retry on the error state calls the hook's refetchAccess", () => {
    const refetchAccess = jest.fn();
    setupMocks({}, false, { isAccessError: true, refetchAccess });
    render(<BuildSidebar isCollapsed={false} />);
    screen.getByRole("button", { name: /try again/i }).click();
    expect(refetchAccess).toHaveBeenCalledTimes(1);
  });

  test("the collapsed rail shows an accessible failure icon instead of the full error card, which a 3.5rem rail cannot fit", () => {
    setupMocks({}, false, { isAccessError: true });
    render(<BuildSidebar isCollapsed />);
    expect(
      screen.getByRole("img", { name: "Build navigation failed to load" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load Build navigation")).not.toBeInTheDocument();
  });
});
