import { act, render, screen } from "@testing-library/react";
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

const ORG_SCOPE: BuildScope = {
  type: "organization",
  pmWorkspaceId: null,
  managedProductId: null,
  projectId: null,
  basePath: "/build",
};

const WORKSPACE_SCOPE: BuildScope = {
  type: "workspace",
  pmWorkspaceId: "ws-1",
  managedProductId: null,
  projectId: null,
  basePath: "/build/workspaces/ws-1",
};

const PRODUCT_SCOPE: BuildScope = {
  type: "product",
  pmWorkspaceId: "ws-1",
  managedProductId: 7,
  projectId: null,
  basePath: "/build/managed-products/7",
};

const PROJECT_SCOPE: BuildScope = {
  type: "project",
  pmWorkspaceId: "ws-1",
  managedProductId: null,
  projectId: 42,
  basePath: "/build/42",
};

const PROJECT_SCOPE_NO_WS: BuildScope = {
  type: "project",
  pmWorkspaceId: null,
  managedProductId: null,
  projectId: 99,
  basePath: "/build/99",
};

const ISSUE_ACTION: BuildCreateAction = {
  id: "issue",
  label: "Issue",
  requiredPermission: "build:tickets:create",
};
const PROJECT_ACTION: BuildCreateAction = {
  id: "project",
  label: "Project",
  requiredPermission: "build:create",
};
const PRODUCT_ACTION: BuildCreateAction = {
  id: "managed-product",
  label: "Product",
  requiredPermission: "build:managed-products:create",
};

function renderQuickCreate(
  scope: BuildScope,
  actions: BuildCreateAction[],
  onNavigate?: jest.Mock,
) {
  return render(
    <BuildQuickCreate
      scope={scope}
      actions={actions}
      isCollapsed={false}
      onNavigate={onNavigate}
    />,
  );
}

function lastProjectDialogProps(): MockProjectDialogProps {
  const calls = mockNewProjectDialog.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][0];
}

function lastProductSheetProps(): MockProductSheetProps {
  const calls = mockManagedProductFormSheet.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][0];
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("action visibility — matrix hidden cells", () => {
  it("Issue is absent at organization scope where no project context exists", async () => {
    const user = userEvent.setup();
    renderQuickCreate(ORG_SCOPE, [PROJECT_ACTION, PRODUCT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.queryByText("Issue")).not.toBeInTheDocument();
    expect(screen.getByText("Project")).toBeInTheDocument();
    expect(screen.getByText("Product")).toBeInTheDocument();
  });

  it("Issue is absent at PM workspace scope where no project context exists", async () => {
    const user = userEvent.setup();
    renderQuickCreate(WORKSPACE_SCOPE, [PROJECT_ACTION, PRODUCT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.queryByText("Issue")).not.toBeInTheDocument();
  });

  it("Issue is absent at managed-product scope where no project context exists", async () => {
    const user = userEvent.setup();
    renderQuickCreate(PRODUCT_SCOPE, [PROJECT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.queryByText("Issue")).not.toBeInTheDocument();
    expect(screen.getByText("Project")).toBeInTheDocument();
  });

  it("Product is absent at managed-product scope", async () => {
    const user = userEvent.setup();
    renderQuickCreate(PRODUCT_SCOPE, [PROJECT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.queryByText("Product")).not.toBeInTheDocument();
  });

  it("Product is absent at project scope", async () => {
    const user = userEvent.setup();
    renderQuickCreate(PROJECT_SCOPE, [ISSUE_ACTION, PROJECT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.queryByText("Product")).not.toBeInTheDocument();
  });
});

describe("action visibility — matrix present cells", () => {
  it("Issue and Project appear at project scope", async () => {
    const user = userEvent.setup();
    renderQuickCreate(PROJECT_SCOPE, [ISSUE_ACTION, PROJECT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByText("Issue")).toBeInTheDocument();
    expect(screen.getByText("Project")).toBeInTheDocument();
  });

  it("Project and Product appear at organization scope", async () => {
    const user = userEvent.setup();
    renderQuickCreate(ORG_SCOPE, [PROJECT_ACTION, PRODUCT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByText("Project")).toBeInTheDocument();
    expect(screen.getByText("Product")).toBeInTheDocument();
  });

  it("Project and Product appear at workspace scope", async () => {
    const user = userEvent.setup();
    renderQuickCreate(WORKSPACE_SCOPE, [PROJECT_ACTION, PRODUCT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByText("Project")).toBeInTheDocument();
    expect(screen.getByText("Product")).toBeInTheDocument();
  });

  it("Project appears at managed-product scope", async () => {
    const user = userEvent.setup();
    renderQuickCreate(PRODUCT_SCOPE, [PROJECT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByText("Project")).toBeInTheDocument();
  });
});

describe("BSN-03-011 — Issue preselects the active project", () => {
  it("calls openCreateTicket with projectId=42 when Issue is selected at project scope", async () => {
    const user = userEvent.setup();
    renderQuickCreate(PROJECT_SCOPE, [ISSUE_ACTION, PROJECT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByText("Issue"));
    expect(mockOpenCreateTicket).toHaveBeenCalledTimes(1);
    expect(mockOpenCreateTicket).toHaveBeenCalledWith(42);
  });

  it("calls onNavigate before opening the issue dialog so mobile drawer closes first", async () => {
    const onNavigate = jest.fn();
    const user = userEvent.setup();
    renderQuickCreate(PROJECT_SCOPE, [ISSUE_ACTION], onNavigate);
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByText("Issue"));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(mockOpenCreateTicket).toHaveBeenCalledWith(42);
  });

  it("passes projectId=99 for a project scope with no workspace in its URL", async () => {
    const user = userEvent.setup();
    renderQuickCreate(PROJECT_SCOPE_NO_WS, [ISSUE_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByText("Issue"));
    expect(mockOpenCreateTicket).toHaveBeenCalledWith(99);
  });
});

describe("Project dialog — scope preselection per matrix cell", () => {
  it("passes an empty scope to the project dialog at organization scope (explicit workspace required)", async () => {
    const user = userEvent.setup();
    renderQuickCreate(ORG_SCOPE, [PROJECT_ACTION, PRODUCT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByText("Project"));
    expect(lastProjectDialogProps().open).toBe(true);
    expect(lastProjectDialogProps().scope).toEqual({});
  });

  it("preselects pmWorkspaceId in the project dialog at PM workspace scope", async () => {
    const user = userEvent.setup();
    renderQuickCreate(WORKSPACE_SCOPE, [PROJECT_ACTION, PRODUCT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByText("Project"));
    expect(lastProjectDialogProps().scope).toEqual({ pmWorkspaceId: "ws-1" });
  });

  it("preselects both pmWorkspaceId and managedProductId in the project dialog at product scope", async () => {
    const user = userEvent.setup();
    renderQuickCreate(PRODUCT_SCOPE, [PROJECT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByText("Project"));
    expect(lastProjectDialogProps().scope).toEqual({ pmWorkspaceId: "ws-1", managedProductId: 7 });
  });

  it("preselects pmWorkspaceId in the project dialog at project scope when workspace is in the URL", async () => {
    const user = userEvent.setup();
    renderQuickCreate(PROJECT_SCOPE, [ISSUE_ACTION, PROJECT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByText("Project"));
    expect(lastProjectDialogProps().scope).toEqual({ pmWorkspaceId: "ws-1" });
  });

  it("passes an empty scope at project scope when the project was not navigated via a workspace URL", async () => {
    const user = userEvent.setup();
    renderQuickCreate(PROJECT_SCOPE_NO_WS, [ISSUE_ACTION, PROJECT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByText("Project"));
    expect(lastProjectDialogProps().scope).toEqual({});
  });
});

describe("Product creation — workspace preselection per matrix cell", () => {
  it("submits with no pmWorkspaceId when at organization scope", async () => {
    const user = userEvent.setup();
    renderQuickCreate(ORG_SCOPE, [PROJECT_ACTION, PRODUCT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByText("Product"));
    act(() => {
      lastProductSheetProps().onSubmitCreate({ name: "P", key: "P" });
    });
    expect(mockCreateProductMutate).toHaveBeenCalledTimes(1);
    expect(mockCreateProductMutate.mock.calls[0][0]).not.toHaveProperty("pmWorkspaceId");
  });

  it("submits with pmWorkspaceId when at workspace scope", async () => {
    const user = userEvent.setup();
    renderQuickCreate(WORKSPACE_SCOPE, [PROJECT_ACTION, PRODUCT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByText("Product"));
    act(() => {
      lastProductSheetProps().onSubmitCreate({ name: "P", key: "P" });
    });
    expect(mockCreateProductMutate).toHaveBeenCalledWith(
      expect.objectContaining({ pmWorkspaceId: "ws-1" }),
      expect.any(Object),
    );
  });
});

describe("BSN-03-015 — no stale scope defaults after rapid scope switching", () => {
  it("project dialog scope reflects the new workspace after scope prop changes while dialog is open", async () => {
    const user = userEvent.setup();
    const { rerender } = renderQuickCreate(WORKSPACE_SCOPE, [PROJECT_ACTION, PRODUCT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByText("Project"));
    expect(lastProjectDialogProps().scope).toEqual({ pmWorkspaceId: "ws-1" });

    rerender(
      <BuildQuickCreate
        scope={{ ...WORKSPACE_SCOPE, pmWorkspaceId: "ws-2" }}
        actions={[PROJECT_ACTION, PRODUCT_ACTION]}
        isCollapsed={false}
      />,
    );

    expect(lastProjectDialogProps().scope).toEqual({ pmWorkspaceId: "ws-2" });
  });

  it("product submission uses ws-2 after scope switches from ws-1 to ws-2 while the sheet is open", async () => {
    const user = userEvent.setup();
    const { rerender } = renderQuickCreate(WORKSPACE_SCOPE, [PROJECT_ACTION, PRODUCT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByText("Product"));

    rerender(
      <BuildQuickCreate
        scope={{ ...WORKSPACE_SCOPE, pmWorkspaceId: "ws-2" }}
        actions={[PROJECT_ACTION, PRODUCT_ACTION]}
        isCollapsed={false}
      />,
    );

    act(() => {
      lastProductSheetProps().onSubmitCreate({ name: "P", key: "P" });
    });
    expect(mockCreateProductMutate).toHaveBeenCalledWith(
      expect.objectContaining({ pmWorkspaceId: "ws-2" }),
      expect.any(Object),
    );
  });
});

describe("permission denial and edge cases", () => {
  it("renders nothing when the actions list is empty so no create affordance appears", () => {
    const { container } = renderQuickCreate(ORG_SCOPE, []);
    expect(container.firstChild).toBeNull();
  });
});

describe("cancellation", () => {
  it("closes the project dialog when the dialog calls onOpenChange with false", async () => {
    const user = userEvent.setup();
    renderQuickCreate(ORG_SCOPE, [PROJECT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByText("Project"));
    expect(lastProjectDialogProps().open).toBe(true);

    act(() => {
      lastProjectDialogProps().onOpenChange(false);
    });
    expect(lastProjectDialogProps().open).toBe(false);
  });

  it("closes the product sheet when the sheet calls onOpenChange with false", async () => {
    const user = userEvent.setup();
    renderQuickCreate(ORG_SCOPE, [PROJECT_ACTION, PRODUCT_ACTION]);
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByText("Product"));
    expect(lastProductSheetProps().open).toBe(true);

    act(() => {
      lastProductSheetProps().onOpenChange(false);
    });
    expect(lastProductSheetProps().open).toBe(false);
  });
});
