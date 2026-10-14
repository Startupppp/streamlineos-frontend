import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ModuleAccessPage } from "./module-access-page";

const mockUseModuleMyPermissions = jest.fn();

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/module-access", () => ({
  useModuleMyPermissions: () => mockUseModuleMyPermissions(),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    actions,
    filters,
    children,
  }: {
    actions?: ReactNode;
    filters?: ReactNode;
    children: ReactNode;
  }) => (
    <div>
      {actions}
      {filters}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

jest.mock("@/features/module-access/components/roles-tab", () => ({
  RolesTab: ({ canManage }: { canManage: boolean }) => (
    <div data-testid="roles-policy">{String(canManage)}</div>
  ),
}));

jest.mock("@/features/module-access/components/module-members-tab", () => ({
  ModuleMembersTab: ({ canManage }: { canManage: boolean }) => (
    <div data-testid="members-policy">{String(canManage)}</div>
  ),
}));

jest.mock("@/features/module-access/components/ownership-section", () => ({
  OwnershipSection: ({ canManage }: { canManage: boolean }) => (
    <div data-testid="ownership-policy">{String(canManage)}</div>
  ),
}));

jest.mock("@/features/module-access/components/audit-log-drawer", () => ({
  AuditLogDrawer: () => null,
}));

interface PermissionFlags {
  isOrgOwner: boolean;
  isOrgAdmin: boolean;
  isModuleOwner: boolean;
  isModuleAdmin: boolean;
}

const NO_PRIVILEGES: PermissionFlags = {
  isOrgOwner: false,
  isOrgAdmin: false,
  isModuleOwner: false,
  isModuleAdmin: false,
};

function renderPage(flags?: Partial<PermissionFlags>) {
  mockUseModuleMyPermissions.mockReturnValue({
    data: flags ? { ...NO_PRIVILEGES, ...flags, permissions: [] } : undefined,
  });
  return render(<ModuleAccessPage moduleKey="hr" title="HR Access" />);
}

function selectTab(name: string) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), {
    button: 0,
    ctrlKey: false,
  });
}

describe("ModuleAccessPage authorization UX", () => {
  beforeEach(() => {
    mockUseModuleMyPermissions.mockReset();
  });

  it.each([
    ["organization owner", { isOrgOwner: true }],
    ["organization admin", { isOrgAdmin: true }],
    ["module owner", { isModuleOwner: true }],
    ["module admin", { isModuleAdmin: true }],
  ])("allows access mutations for %s", (_, flags) => {
    renderPage(flags);

    expect(screen.getByRole("button", { name: "New group" })).toBeInTheDocument();
    expect(screen.getByTestId("roles-policy")).toHaveTextContent("true");

    selectTab("Members");

    expect(screen.getByRole("button", { name: "Add member" })).toBeInTheDocument();
    expect(screen.getByTestId("members-policy")).toHaveTextContent("true");
  });

  it("shows ownership only to the canonical module owner", () => {
    const { rerender } = renderPage({ isOrgAdmin: true, isModuleAdmin: true });

    expect(screen.queryByRole("tab", { name: "Ownership" })).not.toBeInTheDocument();

    mockUseModuleMyPermissions.mockReturnValue({
      data: { ...NO_PRIVILEGES, isOrgOwner: true, permissions: [] },
    });
    rerender(<ModuleAccessPage moduleKey="hr" title="HR Access" />);

    expect(screen.queryByRole("tab", { name: "Ownership" })).not.toBeInTheDocument();

    mockUseModuleMyPermissions.mockReturnValue({
      data: { ...NO_PRIVILEGES, isModuleOwner: true, permissions: [] },
    });
    rerender(<ModuleAccessPage moduleKey="hr" title="HR Access" />);

    selectTab("Ownership");
    expect(screen.getByTestId("ownership-policy")).toHaveTextContent("true");
  });

  it("shows no-permission state when authority has resolved and is absent", () => {
    renderPage();

    expect(screen.getByText("Admin access required")).toBeInTheDocument();
    expect(screen.queryByTestId("roles-policy")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New group" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Ownership" })).not.toBeInTheDocument();
  });

  it("does not deny access while permissions are still loading", () => {
    mockUseModuleMyPermissions.mockReturnValue({ data: undefined, isLoading: true });
    render(<ModuleAccessPage moduleKey="hr" title="HR Access" />);

    expect(screen.queryByText("Admin access required")).not.toBeInTheDocument();
    expect(screen.getByTestId("roles-policy")).toBeInTheDocument();
  });
});
