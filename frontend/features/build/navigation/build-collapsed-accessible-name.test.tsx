import React from "react";
import { render, screen } from "@testing-library/react";
import { FolderIcon } from "lucide-react";
import { BuildNavLink } from "./build-nav-link";
import { BuildQuickCreate } from "./build-quick-create";
import { BuildMoreToolsMenu } from "./build-more-tools-menu";
import { DirtyStateProvider } from "@/components/shared/dirty-state-context";
import type { BuildNavDestination, BuildCreateAction } from "@/lib/build/nav/build-nav-destination";
import type { ModuleAccent } from "@/components/layout/sidebar/sidebar-nav-items";
import type { BuildScope } from "@/lib/build/build-scope";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/components/layout/nav-intent-prefetch", () => ({
  useNavIntentPrefetch: () => jest.fn(),
}));

jest.mock("@/components/layout/nav-pending-indicator", () => ({
  NavPendingIndicator: () => null,
}));

jest.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
  Tooltip: ({ children }: React.PropsWithChildren) => <>{children}</>,
  TooltipTrigger: ({ children }: React.PropsWithChildren<{ asChild?: boolean }>) => (
    <>{children}</>
  ),
  TooltipContent: () => null,
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: () => null,
  EllipsisIcon: () => null,
}));

jest.mock("@/components/layout/sidebar/sidebar-animated-nav", () => ({
  SidebarAnimatedNavIcon: () => null,
  useAnimatedNavIconHover: () => ({
    iconRef: { current: null },
    animatedNavHoverHandlers: {},
  }),
}));

jest.mock("@/components/command-palette", () => ({
  useCommandPalette: () => ({ openCreateTicket: jest.fn() }),
}));

jest.mock("@/hooks/api/build/managed-products", () => ({
  useCreateManagedProduct: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("next/dynamic", () => () => () => null);

const DEST: BuildNavDestination = {
  id: "build-inbox",
  label: "Inbox",
  href: "/build/inbox",
  icon: FolderIcon,
  requiredPermission: "build:approvals:view",
};

const ACCENT: ModuleAccent = { bg: "", text: "", indicator: "", border: "" };

const ORG_SCOPE: BuildScope = {
  type: "organization",
  managedProductId: null,
  projectId: null,
  basePath: "/build",
};

const CREATE_ACTIONS: BuildCreateAction[] = [
  { id: "project", label: "Project", requiredPermission: "build:create" },
];

const MORE_TOOLS: BuildNavDestination[] = [
  {
    id: "analytics",
    label: "Analytics",
    href: "/build/analytics",
    icon: FolderIcon,
    requiredPermission: "build:view",
  },
];

const MORE_TOOLS_BASE = {
  tools: MORE_TOOLS,
  pathname: "/build",
  view: null,
  isPinned: (_id: string) => false,
  canPinMore: true,
  onTogglePin: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("BSN-03-A08 — collapsed Build nav controls have an equivalent accessible name to expanded, so a screen-reader user does not lose navigation when the icon rail collapses", () => {
  const controlsVerified: string[] = [];

  afterAll(() => {
    expect(controlsVerified.length).toBeGreaterThanOrEqual(3);
  });

  it("a collapsed BuildNavLink link keeps the same accessible name as in expanded state, so a screen-reader user does not lose the nav item label when the rail collapses", () => {
    const { unmount: unmountExpanded } = render(
      <DirtyStateProvider>
        <BuildNavLink
          destination={DEST}
          isActive={false}
          isCollapsed={false}
          accent={ACCENT}
        />
      </DirtyStateProvider>,
    );
    expect(screen.getByRole("link", { name: "Inbox" })).toHaveAccessibleName("Inbox");
    unmountExpanded();

    render(
      <DirtyStateProvider>
        <BuildNavLink
          destination={DEST}
          isActive={false}
          isCollapsed={true}
          accent={ACCENT}
        />
      </DirtyStateProvider>,
    );
    expect(screen.getByRole("link", { name: "Inbox" })).toHaveAccessibleName("Inbox");

    controlsVerified.push("BuildNavLink");
  });

  it("a collapsed BuildQuickCreate button keeps the same accessible name as in expanded state, so a screen-reader user can trigger creation from the icon rail without losing the label", () => {
    const { unmount: unmountExpanded } = render(
      <BuildQuickCreate
        scope={ORG_SCOPE}
        actions={CREATE_ACTIONS}
        isCollapsed={false}
      />,
    );
    const expandedName =
      screen.getByRole("button", { name: "Create" }).textContent ?? "";
    expect(expandedName).toBe("Create");
    unmountExpanded();

    render(
      <BuildQuickCreate
        scope={ORG_SCOPE}
        actions={CREATE_ACTIONS}
        isCollapsed={true}
      />,
    );
    const collapsed = screen.getByRole("button", { name: "Create" });
    expect(collapsed).toHaveAccessibleName(expandedName);
    expect(collapsed).toBeEmptyDOMElement();

    controlsVerified.push("BuildQuickCreate");
  });

  it("a collapsed BuildMoreToolsMenu button keeps the same accessible name as in expanded state, so a screen-reader user can reach the full tools list from the icon rail", () => {
    const { unmount: unmountExpanded } = render(
      <BuildMoreToolsMenu {...MORE_TOOLS_BASE} isCollapsed={false} />,
    );
    expect(
      screen.getByRole("button", { name: "More Build tools" }),
    ).toHaveAccessibleName("More Build tools");
    unmountExpanded();

    render(<BuildMoreToolsMenu {...MORE_TOOLS_BASE} isCollapsed={true} />);
    expect(
      screen.getByRole("button", { name: "More Build tools" }),
    ).toHaveAccessibleName("More Build tools");

    controlsVerified.push("BuildMoreToolsMenu");
  });
});
