import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BuildQuickCreate } from "./build-quick-create";
import type { BuildScope } from "@/lib/build/build-scope";
import type { BuildCreateAction } from "@/lib/build/nav/build-nav-destination";
import type { ProjectCreateScope } from "@/features/build/project-create/use-project-provisioning";
import type { CreateManagedProductInput } from "@/types/projects/managed-products";

interface MockProjectDialogProps {
  trigger: null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: ProjectCreateScope;
}

interface MockProductSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create";
  onSubmitCreate: (input: CreateManagedProductInput) => void;
  isPending: boolean;
}

const mockOpenCreateTicket = jest.fn();
const mockNewProjectDialog = jest.fn((_props: MockProjectDialogProps) => null);
const mockManagedProductFormSheet = jest.fn((_props: MockProductSheetProps) => null);
const mockCreateProductMutate = jest.fn();

jest.mock("next/dynamic", () => {
  let callIdx = 0;
  return () => {
    const idx = callIdx++;
    if (idx === 0) {
      return function MockNewProjectDialog(props: MockProjectDialogProps) {
        return mockNewProjectDialog(props);
      };
    }
    return function MockManagedProductFormSheet(props: MockProductSheetProps) {
      return mockManagedProductFormSheet(props);
    };
  };
});

jest.mock("@/components/command-palette", () => ({
  useCommandPalette: () => ({ openCreateTicket: mockOpenCreateTicket }),
}));

jest.mock("@/hooks/api/build/managed-products", () => ({
  useCreateManagedProduct: () => ({ mutate: mockCreateProductMutate, isPending: false }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: () => null,
}));

jest.mock("@/components/layout/sidebar/sidebar-animated-nav", () => ({
  useAnimatedNavIconHover: () => ({
    iconRef: { current: null },
    animatedNavHoverHandlers: {},
  }),
  SidebarAnimatedNavIcon: () => null,
}));

const ORG_A_WORKSPACE_SCOPE: BuildScope = {
  type: "workspace",
  pmWorkspaceId: "ws-alpha",
  managedProductId: null,
  projectId: null,
  basePath: "/build/workspaces/ws-alpha",
};

const ORG_B_WORKSPACE_SCOPE: BuildScope = {
  type: "workspace",
  pmWorkspaceId: "ws-beta",
  managedProductId: null,
  projectId: null,
  basePath: "/build/workspaces/ws-beta",
};

const ORG_A_PRODUCT_SCOPE: BuildScope = {
  type: "product",
  pmWorkspaceId: "ws-alpha",
  managedProductId: 1,
  projectId: null,
  basePath: "/build/managed-products/1",
};

const ORG_B_PRODUCT_SCOPE: BuildScope = {
  type: "product",
  pmWorkspaceId: "ws-beta",
  managedProductId: 2,
  projectId: null,
  basePath: "/build/managed-products/2",
};

const PROJECT_ACTION: BuildCreateAction = {
  id: "project",
  label: "Project",
  requiredPermission: "build:create",
};

function lastProjectDialogProps(): MockProjectDialogProps {
  const calls = mockNewProjectDialog.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][0];
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("BSN-04-042 — Quick Create never preselects a scope from another organization", () => {
  it("workspace scope for org B preselects org B's workspace ID, not org A's", async () => {
    const user = userEvent.setup();
    render(
      <BuildQuickCreate
        scope={ORG_B_WORKSPACE_SCOPE}
        actions={[PROJECT_ACTION]}
        isCollapsed={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByText("Project"));
    expect(lastProjectDialogProps().scope).toEqual({ pmWorkspaceId: "ws-beta" });
    expect(lastProjectDialogProps().scope).not.toEqual({ pmWorkspaceId: "ws-alpha" });
  });

  it("product scope for org B preselects org B's workspace and product IDs, not org A's", async () => {
    const user = userEvent.setup();
    render(
      <BuildQuickCreate
        scope={ORG_B_PRODUCT_SCOPE}
        actions={[PROJECT_ACTION]}
        isCollapsed={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByText("Project"));
    const dialogScope = lastProjectDialogProps().scope;
    expect(dialogScope).toMatchObject({ pmWorkspaceId: "ws-beta", managedProductId: 2 });
    expect(dialogScope).not.toMatchObject({ pmWorkspaceId: "ws-alpha" });
    expect(dialogScope).not.toMatchObject({ managedProductId: 1 });
  });

  it("isolation bites: rendering with org A's workspace scope preselects org A's workspace ID, confirming the preselection is scope-driven not cached", async () => {
    const user = userEvent.setup();
    render(
      <BuildQuickCreate
        scope={ORG_A_WORKSPACE_SCOPE}
        actions={[PROJECT_ACTION]}
        isCollapsed={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByText("Project"));
    expect(lastProjectDialogProps().scope).toEqual({ pmWorkspaceId: "ws-alpha" });
  });

  it("isolation bites: rendering with org A's product scope preselects org A's identifiers, confirming no cross-org leakage", async () => {
    const user = userEvent.setup();
    render(
      <BuildQuickCreate
        scope={ORG_A_PRODUCT_SCOPE}
        actions={[PROJECT_ACTION]}
        isCollapsed={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByText("Project"));
    const dialogScope = lastProjectDialogProps().scope;
    expect(dialogScope).toMatchObject({ pmWorkspaceId: "ws-alpha", managedProductId: 1 });
  });
});
