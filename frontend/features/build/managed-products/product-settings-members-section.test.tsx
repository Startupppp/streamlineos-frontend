import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { ProductSettingsMembersSection } from "./product-settings-members-section";

let mockSearch = "";

const mockReplace = jest.fn((url: string) => {
  mockSearch = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => "/build/managed-products/7/settings",
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

jest.mock("@/hooks/api/build/managed-product-members", () => ({
  useManagedProductMembers: jest.fn(),
  useRemoveManagedProductMember: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useCanState: jest.fn(() => "granted"),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("./add-product-member-dialog", () => ({
  AddProductMemberDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="add-member-dialog" /> : null,
}));

const { useManagedProductMembers, useRemoveManagedProductMember } = jest.requireMock(
  "@/hooks/api/build/managed-product-members",
) as { useManagedProductMembers: jest.Mock; useRemoveManagedProductMember: jest.Mock };

const MANAGED_PRODUCT_ID = 7;

const MEMBER = {
  id: 11,
  organizationMembershipId: 501,
  role: "admin",
  member: { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
};

const OTHER_MEMBER = { ...MEMBER, id: 12, organizationMembershipId: 502, role: "member" };

function page(
  rows: unknown[],
  pagination?: { hasMore?: boolean; nextCursor?: string | null },
) {
  return {
    data: rows,
    pagination: {
      limit: 20,
      hasMore: pagination?.hasMore ?? false,
      nextCursor: pagination?.nextCursor ?? null,
    },
  };
}

function result(overrides: Record<string, unknown> = {}) {
  return {
    data: page([MEMBER]),
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  };
}

describe("ProductSettingsMembersSection", () => {
  beforeEach(() => {
    mockSearch = "";
    mockReplace.mockClear();
  });

  it("keeps the remove dialog open and explains why when the last admin cannot be removed", async () => {
    const mutate = jest.fn((_id: number, opts: { onError?: (e: unknown) => void }) =>
      opts.onError?.(new ApiError("Cannot remove the last admin", 409, "CONFLICT")),
    );
    useRemoveManagedProductMember.mockReturnValue({ mutate, isPending: false });
    useManagedProductMembers.mockReturnValue(result());
    render(<ProductSettingsMembersSection managedProductId={MANAGED_PRODUCT_ID} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Ada Lovelace" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    });

    expect(mutate).toHaveBeenCalledWith(MEMBER.id, expect.any(Object));
    expect(screen.getByText("Cannot remove the last admin of a product.")).toBeInTheDocument();
  });

  it("lists the product members", () => {
    useManagedProductMembers.mockReturnValue(result());

    render(<ProductSettingsMembersSection managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("renders an error state instead of reporting an empty roster when the read fails", () => {
    useManagedProductMembers.mockReturnValue(
      result({ data: undefined, isError: true, error: new Error("upstream down") }),
    );

    render(<ProductSettingsMembersSection managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.getByText("Could not load product members")).toBeInTheDocument();
    expect(screen.queryByText("No members yet.")).toBeNull();
  });

  it("retries the read from the error state", () => {
    const refetch = jest.fn();
    useManagedProductMembers.mockReturnValue(
      result({ data: undefined, isError: true, error: new Error("upstream down"), refetch }),
    );

    render(<ProductSettingsMembersSection managedProductId={MANAGED_PRODUCT_ID} />);
    fireEvent.click(screen.getByRole("button", { name: /retry|try again/i }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("reports an empty roster only when the read succeeded with no rows", () => {
    useManagedProductMembers.mockReturnValue(result({ data: page([]) }));

    render(<ProductSettingsMembersSection managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.getByText("No members yet.")).toBeInTheDocument();
  });

  it("hides the pager while the request is failed so a stale page number cannot be navigated", () => {
    useManagedProductMembers.mockReturnValue(
      result({ data: undefined, isError: true, error: new Error("upstream down") }),
    );

    render(<ProductSettingsMembersSection managedProductId={MANAGED_PRODUCT_ID} />);

    expect(screen.queryByRole("button", { name: /next/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /previous/i })).toBeNull();
  });

  it("steps back one page at a time from page three rather than jumping to the first page", () => {
    useManagedProductMembers.mockReturnValue(
      result({ data: page([MEMBER], { hasMore: true, nextCursor: "cursor-2" }) }),
    );
    const view = render(
      <ProductSettingsMembersSection managedProductId={MANAGED_PRODUCT_ID} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    useManagedProductMembers.mockReturnValue(
      result({ data: page([OTHER_MEMBER], { hasMore: true, nextCursor: "cursor-3" }) }),
    );
    view.rerender(<ProductSettingsMembersSection managedProductId={MANAGED_PRODUCT_ID} />);
    expect(useManagedProductMembers).toHaveBeenLastCalledWith(
      MANAGED_PRODUCT_ID,
      expect.objectContaining({ cursor: "cursor-2" }),
    );

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    view.rerender(<ProductSettingsMembersSection managedProductId={MANAGED_PRODUCT_ID} />);
    expect(useManagedProductMembers).toHaveBeenLastCalledWith(
      MANAGED_PRODUCT_ID,
      expect.objectContaining({ cursor: "cursor-3" }),
    );

    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    view.rerender(<ProductSettingsMembersSection managedProductId={MANAGED_PRODUCT_ID} />);
    expect(useManagedProductMembers).toHaveBeenLastCalledWith(
      MANAGED_PRODUCT_ID,
      expect.objectContaining({ cursor: "cursor-2" }),
    );
  });
});
