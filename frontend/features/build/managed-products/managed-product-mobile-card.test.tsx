import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { ManagedProductMobileCard } from "./managed-product-mobile-card";
import type { ManagedProduct } from "@/types/projects";

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

const ownerUuid = "550e8400-e29b-41d4-a716-446655440000";

const product = {
  id: 7,
  name: "Atlas",
  key: "ATL",
  ownerId: ownerUuid,
  status: "active",
  health: "on_track",
  lifecycle: "growth",
  linkedProjectCount: 3,
  nextRelease: { id: 1, name: "Beta", version: "1.2", releaseDate: null },
  updatedAt: "2026-10-10T00:00:00Z",
  owner: {
    id: ownerUuid,
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    image: null,
  },
} as ManagedProduct;

function renderCard(
  row: ManagedProduct = product,
  ownerOf: () => { name?: string | null; email?: string | null } | null = () => ({
    name: ownerUuid,
  }),
) {
  render(
    <ManagedProductMobileCard
      product={row}
      canUpdate
      canDelete
      ownerOf={ownerOf}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
    />,
  );
}

describe("ManagedProductMobileCard", () => {
  it("renders a product row with key, name, owner, and signals instead of dumped table labels", () => {
    renderCard();

    expect(screen.getByText("ATL")).toBeInTheDocument();
    expect(screen.getByText("Atlas")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Growth · 3 projects · Beta")).toBeInTheDocument();
    expect(screen.queryByText(ownerUuid)).not.toBeInTheDocument();
    expect(screen.queryByText("Key")).not.toBeInTheDocument();
    expect(screen.queryByText("Lifecycle")).not.toBeInTheDocument();
    expect(screen.queryByText("Projects")).not.toBeInTheDocument();
  });

  it("never shows a raw UUID when the member lookup only has an id-shaped name", () => {
    renderCard(
      { ...product, owner: null },
      () => ({ name: ownerUuid, email: "ada@example.com" }),
    );

    expect(screen.getByText("ada")).toBeInTheDocument();
    expect(screen.queryByText(ownerUuid)).not.toBeInTheDocument();
  });
});
