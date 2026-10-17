import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { buildManagedProductColumns, ProductRowActions } from "./managed-product-table-columns";
import type { ManagedProduct } from "@/types/projects";

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, variant }: { children: ReactNode; variant?: string }) => (
    <div role="menuitem" data-variant={variant ?? "default"}>{children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

const product = {
  id: 7,
  name: "Atlas",
  key: "ATL",
  description: null,
  ownerId: null,
  status: "active",
  version: 1,
} as ManagedProduct;

function renderActions(canUpdate: boolean, canDelete: boolean) {
  render(
    <ProductRowActions
      product={{ ...product, allowedActions: ["update", "delete", "archive", "restore"] }}
      canUpdate={canUpdate}
      canDelete={canDelete}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
      onArchive={jest.fn()}
      onRestore={jest.fn()}
    />,
  );
}

describe("managed product row action permissions", () => {
  it("pairs every action label with an icon while retaining destructive styling", () => {
    renderActions(true, true);

    for (const label of ["Open", "Copy link", "Copy key", "Edit", "Delete"]) {
      const item = screen.getByText(label).closest('[role="menuitem"]');
      expect(item?.querySelector("svg")).not.toBeNull();
    }
    expect(screen.getByText("Delete").closest('[role="menuitem"]')).toHaveAttribute(
      "data-variant",
      "destructive",
    );
  });

  it("does not expose Delete to an update-only user", () => {
    renderActions(true, false);

    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("does not expose Edit to a delete-only user", () => {
    renderActions(false, true);

    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });
});

describe("managed product row actions — allowedActions gating", () => {
  function renderWithAllowedActions(allowedActions: string[], isArchived = false) {
    render(
      <ProductRowActions
        product={{ ...product, status: isArchived ? "archived" : "active", allowedActions }}
        canUpdate
        canDelete
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onArchive={jest.fn()}
        onRestore={jest.fn()}
      />,
    );
  }

  it("hides Edit when server allowedActions excludes update", () => {
    renderWithAllowedActions(["view", "archive", "delete"]);

    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.getByText("Archive")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("hides Archive when server allowedActions excludes archive", () => {
    renderWithAllowedActions(["view", "update", "delete"]);

    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.queryByText("Archive")).not.toBeInTheDocument();
  });

  it("hides Delete when server allowedActions excludes delete", () => {
    renderWithAllowedActions(["view", "update", "archive"]);

    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("shows Restore and not Archive for an archived product with restore in allowedActions", () => {
    renderWithAllowedActions(["view", "restore", "delete"], true);

    expect(screen.getByText("Restore")).toBeInTheDocument();
    expect(screen.queryByText("Archive")).not.toBeInTheDocument();
  });

  it("hides all permissioned actions when allowedActions is absent (fails closed)", () => {
    render(
      <ProductRowActions
        product={{ ...product, allowedActions: undefined }}
        canUpdate
        canDelete
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onArchive={jest.fn()}
        onRestore={jest.fn()}
      />,
    );

    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Archive")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
  });
});

describe("managed product name column", () => {
  function renderName(row: ManagedProduct) {
    const [nameColumn] = buildManagedProductColumns({
      canUpdate: true,
      canDelete: true,
      ownerOf: () => null,
      onEdit: jest.fn(),
      onDelete: jest.fn(),
    });
    render(<>{nameColumn.cell(row)}</>);
  }

  it("marks an archived product next to its name", () => {
    renderName({ ...product, status: "archived" });

    expect(screen.getByRole("link", { name: "Atlas" })).toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });

  it("shows no archived marker for an active product", () => {
    renderName(product);

    expect(screen.getByRole("link", { name: "Atlas" })).toBeInTheDocument();
    expect(screen.queryByText("Archived")).not.toBeInTheDocument();
  });

  it("shows the product key under the name", () => {
    renderName(product);

    expect(screen.getByText("ATL")).toBeInTheDocument();
  });
});

describe("managed product owner column", () => {
  const ownerUuid = "550e8400-e29b-41d4-a716-446655440000";

  function renderOwner(
    row: ManagedProduct,
    ownerOf: () => { name?: string | null; email?: string | null } | null = () => null,
  ) {
    const columns = buildManagedProductColumns({
      canUpdate: true,
      canDelete: true,
      ownerOf,
      onEdit: jest.fn(),
      onDelete: jest.fn(),
    });
    const ownerColumn = columns.find((column) => column.key === "ownerId");
    render(<>{ownerColumn?.cell(row)}</>);
  }

  it("renders the embedded owner name and never the owner id", () => {
    renderOwner({
      ...product,
      ownerId: ownerUuid,
      owner: {
        id: ownerUuid,
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        image: null,
      },
    });

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByText(ownerUuid)).not.toBeInTheDocument();
  });

  it("does not render a UUID when that is the only stored member name", () => {
    renderOwner({ ...product, ownerId: ownerUuid }, () => ({
      name: ownerUuid,
      email: "ada@example.com",
    }));

    expect(screen.getByText("ada")).toBeInTheDocument();
    expect(screen.queryByText(ownerUuid)).not.toBeInTheDocument();
  });

  it("renders Unassigned when no owner can be resolved", () => {
    renderOwner(product);

    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });
});
