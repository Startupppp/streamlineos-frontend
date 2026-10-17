import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PERMISSION_METADATA, type PermissionKey } from "@/contracts/permission-key.generated";
import type { Permission } from "@/lib/rbac/permissions";
import type { Role } from "@/types/organization";
import { PermissionMatrix } from "./permission-matrix";

const mutate = jest.fn();

jest.mock("@/hooks/api/roles", () => ({
  useRolePermissionGrants: () => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useSetRolePermissions: () => ({ mutate, isPending: false }),
}));

const SENSITIVE_KEY: PermissionKey = "payroll:bank:view";
const ORDINARY_KEY: PermissionKey = "payroll:bank:manage";

function catalogPermission(name: PermissionKey): Permission {
  return { name, ...PERMISSION_METADATA[name] };
}

const CATALOG: Permission[] = [catalogPermission(SENSITIVE_KEY), catalogPermission(ORDINARY_KEY)];

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: { scopes: {}, modules: {}, isOrgOwner: false } }),
  usePermissionCatalog: () => ({ data: CATALOG, isLoading: false, isError: false, error: null }),
}));

const ROLE: Role = {
  id: 7,
  name: "Payroll clerk",
  slug: "payroll-clerk",
  rank: 30,
  orgId: "org-1",
  version: 1,
  isSystem: false,
  moduleKey: "payroll",
  createdBy: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  description: null,
};

function noop(): void {
  return undefined;
}

async function renderExpanded() {
  const user = userEvent.setup();
  render(<PermissionMatrix role={ROLE} onOpenAssignments={noop} />);
  await user.click(screen.getByRole("button", { name: /Payroll/ }));
  return user;
}

function checkboxFor(key: PermissionKey): HTMLElement {
  return screen.getByRole("checkbox", { name: PERMISSION_METADATA[key].description, hidden: true });
}

function labelOf(key: PermissionKey): HTMLLabelElement {
  const label = checkboxFor(key).closest("label");
  if (!label) throw new Error(`no label wraps ${key}`);
  return label;
}

describe("PermissionMatrix sensitivity", () => {
  it("marks the catalogue's sensitive permission and leaves the ordinary one unmarked", async () => {
    await renderExpanded();
    expect(within(labelOf(SENSITIVE_KEY)).getByText("Sensitive")).toBeInTheDocument();
    expect(within(labelOf(ORDINARY_KEY)).queryByText("Sensitive")).toBeNull();
  });

  it("grants an ordinary permission without asking", async () => {
    const user = await renderExpanded();
    await user.click(checkboxFor(ORDINARY_KEY));
    expect(screen.queryByText("Grant sensitive access?")).toBeNull();
    expect(checkboxFor(ORDINARY_KEY)).toBeChecked();
  });

  it("holds a sensitive grant until it is explicitly confirmed", async () => {
    const user = await renderExpanded();
    await user.click(checkboxFor(SENSITIVE_KEY));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText("Grant sensitive access?")).toBeInTheDocument();
    expect(within(dialog).getByText(SENSITIVE_KEY)).toBeInTheDocument();
    expect(checkboxFor(SENSITIVE_KEY)).not.toBeChecked();

    await user.click(within(dialog).getByRole("button", { name: "Grant sensitive access" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(checkboxFor(SENSITIVE_KEY)).toBeChecked();
  });

  it("drops a sensitive grant that is cancelled", async () => {
    const user = await renderExpanded();
    await user.click(checkboxFor(SENSITIVE_KEY));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(checkboxFor(SENSITIVE_KEY)).not.toBeChecked();
  });

  it("asks before a whole-module toggle sweeps in a sensitive permission", async () => {
    const user = await renderExpanded();
    await user.click(screen.getByRole("checkbox", { name: "Toggle all Payroll permissions" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(checkboxFor(ORDINARY_KEY)).not.toBeChecked();
    expect(checkboxFor(SENSITIVE_KEY)).not.toBeChecked();
  });

  it("revokes a sensitive permission without asking", async () => {
    const user = await renderExpanded();
    await user.click(checkboxFor(SENSITIVE_KEY));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Grant sensitive access" }));
    await user.click(checkboxFor(SENSITIVE_KEY));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(checkboxFor(SENSITIVE_KEY)).not.toBeChecked();
  });
});
