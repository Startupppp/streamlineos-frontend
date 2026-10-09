import { render, screen } from "@testing-library/react";
import { PackageDetailSheet } from "./package-detail-sheet";

const mockPackages = {
  1: {
    id: 1,
    status: "OPEN",
    shipmentId: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    lines: [{ id: 11, productVariantId: 101, quantity: "2", lotId: null, serialId: null }],
  },
  2: {
    id: 2,
    status: "OPEN",
    shipmentId: null,
    createdAt: "2026-10-02T00:00:00.000Z",
    lines: [{ id: 22, productVariantId: 202, quantity: "4", lotId: null, serialId: null }],
  },
} as const;

jest.mock("@/hooks/api/inventory/shipping", () => ({
  usePackageDetail: (id: 1 | 2) => ({
    data: mockPackages[id],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useUpdatePackageLines: () => ({ mutate: jest.fn(), isPending: false }),
  useClosePackage: () => ({ mutate: jest.fn(), isPending: false }),
  useReopenPackage: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/inventory/products", () => ({
  useProductVariants: () => ({ data: [] }),
}));

jest.mock("@/components/shared/app-sheet", () => ({
  AppSheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("./package-editable-line-row", () => ({
  EditableLineRow: ({ line }: { line: { variantId: string; qty: string } }) => (
    <div>{line.variantId}:{line.qty}</div>
  ),
}));

jest.mock("./package-lifecycle-dialogs", () => ({
  PackageLifecycleDialogs: () => null,
}));

describe("PackageDetailSheet package identity", () => {
  it("derives fresh editable lines immediately when the selected package changes", () => {
    const props = { open: true, onOpenChange: jest.fn() };
    const { rerender } = render(<PackageDetailSheet {...props} packageId={1} />);
    expect(screen.getByText("101:2")).toBeInTheDocument();

    rerender(<PackageDetailSheet {...props} packageId={2} />);
    expect(screen.queryByText("101:2")).not.toBeInTheDocument();
    expect(screen.getByText("202:4")).toBeInTheDocument();
  });
});
