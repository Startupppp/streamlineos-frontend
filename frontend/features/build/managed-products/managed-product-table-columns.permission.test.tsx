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
      product={product}
      canUpdate={canUpdate}
      canDelete={canDelete}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
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
});
