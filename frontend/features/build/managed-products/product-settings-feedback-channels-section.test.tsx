import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductSettingsFeedbackChannelsSection } from "./product-settings-feedback-channels-section";

let mockSearch = "";

const mockReplace = jest.fn((url: string) => {
  mockSearch = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => "/build/managed-products/7/settings",
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

jest.mock("@/hooks/api/feedbucket/use-feedbucket-widgets", () => ({
  useFeedbucketWidgets: jest.fn(),
  useCreateFeedbucketWidget: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateFeedbucketWidget: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/build/managed-products", () => ({
  useManagedProduct: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("./feedback/feedbucket-collect-dialog", () => ({
  FeedbucketCollectDialog: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="collect-dialog">
        <button type="button" onClick={() => onOpenChange(false)}>
          Close
        </button>
      </div>
    ) : null,
}));

const { useFeedbucketWidgets } = jest.requireMock(
  "@/hooks/api/feedbucket/use-feedbucket-widgets",
) as { useFeedbucketWidgets: jest.Mock };

const MANAGED_PRODUCT_ID = 7;

const ACTIVE_WIDGET = {
  id: 1,
  managedProductId: MANAGED_PRODUCT_ID,
  name: "Product feedback",
  isActive: true,
  deletedAt: null,
};

const INACTIVE_WIDGET = {
  id: 2,
  managedProductId: MANAGED_PRODUCT_ID,
  name: "Old widget",
  isActive: false,
  deletedAt: null,
};

function page(
  rows: unknown[],
  pagination?: { limit?: number; hasMore?: boolean; nextCursor?: string | null },
) {
  return {
    data: rows,
    pagination: {
      limit: pagination?.limit ?? 20,
      hasMore: pagination?.hasMore ?? false,
      nextCursor: pagination?.nextCursor ?? null,
    },
  };
}

describe("ProductSettingsFeedbackChannelsSection", () => {
  beforeEach(() => {
    mockSearch = "";
    mockReplace.mockClear();
  });

  it("steps back one page at a time from page three rather than jumping to the first page", () => {
    useFeedbucketWidgets.mockReturnValue({
      data: page([ACTIVE_WIDGET], { hasMore: true, nextCursor: "cursor-2" }),
      isLoading: false,
    });
    const view = render(
      <ProductSettingsFeedbackChannelsSection managedProductId={MANAGED_PRODUCT_ID} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    useFeedbucketWidgets.mockReturnValue({
      data: page([ACTIVE_WIDGET], { hasMore: true, nextCursor: "cursor-3" }),
      isLoading: false,
    });
    view.rerender(
      <ProductSettingsFeedbackChannelsSection managedProductId={MANAGED_PRODUCT_ID} />,
    );
    expect(useFeedbucketWidgets).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: "cursor-2" }),
    );

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    view.rerender(
      <ProductSettingsFeedbackChannelsSection managedProductId={MANAGED_PRODUCT_ID} />,
    );
    expect(useFeedbucketWidgets).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: "cursor-3" }),
    );

    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    view.rerender(
      <ProductSettingsFeedbackChannelsSection managedProductId={MANAGED_PRODUCT_ID} />,
    );
    expect(useFeedbucketWidgets).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: "cursor-2" }),
    );
  });

  it("hides the pager while the request is failed so a stale page number cannot be navigated", () => {
    useFeedbucketWidgets.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("boom"),
      refetch: jest.fn(),
    });

    render(
      <ProductSettingsFeedbackChannelsSection managedProductId={MANAGED_PRODUCT_ID} />,
    );

    expect(screen.queryByRole("button", { name: /next/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /previous/i })).toBeNull();
  });

  it("renders the section heading", () => {
    useFeedbucketWidgets.mockReturnValue({ data: page([]), isLoading: false });

    render(
      <ProductSettingsFeedbackChannelsSection
        managedProductId={MANAGED_PRODUCT_ID}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Feedback channels" }),
    ).toBeInTheDocument();
  });

  it("shows a skeleton while loading", () => {
    useFeedbucketWidgets.mockReturnValue({ data: undefined, isLoading: true });

    render(
      <ProductSettingsFeedbackChannelsSection
        managedProductId={MANAGED_PRODUCT_ID}
      />,
    );

    expect(screen.getByRole("heading", { name: "Feedback channels" })).toBeInTheDocument();
    expect(screen.queryByText("No Feedbucket widgets")).not.toBeInTheDocument();
  });

  it("shows empty state when no widgets are linked to this product", () => {
    useFeedbucketWidgets.mockReturnValue({ data: page([]), isLoading: false });

    render(
      <ProductSettingsFeedbackChannelsSection
        managedProductId={MANAGED_PRODUCT_ID}
      />,
    );

    expect(
      screen.getByText(/No Feedbucket widgets are linked to this product yet/),
    ).toBeInTheDocument();
  });

  it("lists active widgets linked to the product with Active badge", () => {
    useFeedbucketWidgets.mockReturnValue({
      data: page([ACTIVE_WIDGET]),
      isLoading: false,
    });

    render(
      <ProductSettingsFeedbackChannelsSection
        managedProductId={MANAGED_PRODUCT_ID}
      />,
    );

    expect(screen.getByText("Product feedback")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("asks the server for this product's widgets instead of filtering a full list client-side", () => {
    useFeedbucketWidgets.mockReturnValue({ data: page([]), isLoading: false });

    render(
      <ProductSettingsFeedbackChannelsSection
        managedProductId={MANAGED_PRODUCT_ID}
      />,
    );

    expect(useFeedbucketWidgets).toHaveBeenCalledWith(
      expect.objectContaining({ managedProductId: MANAGED_PRODUCT_ID }),
    );
  });

  it("shows Inactive badge for a paused widget", () => {
    useFeedbucketWidgets.mockReturnValue({
      data: page([INACTIVE_WIDGET]),
      isLoading: false,
    });

    render(
      <ProductSettingsFeedbackChannelsSection
        managedProductId={MANAGED_PRODUCT_ID}
      />,
    );

    expect(screen.getByText("Old widget")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("pages forward with the server cursor rather than loading every widget at once", () => {
    useFeedbucketWidgets.mockReturnValue({
      data: page([ACTIVE_WIDGET], { hasMore: true, nextCursor: "cursor-2" }),
      isLoading: false,
    });

    render(
      <ProductSettingsFeedbackChannelsSection
        managedProductId={MANAGED_PRODUCT_ID}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(useFeedbucketWidgets).toHaveBeenLastCalledWith(
      expect.objectContaining({
        managedProductId: MANAGED_PRODUCT_ID,
        cursor: "cursor-2",
      }),
    );
  });

  it("opens the collect dialog when Configure Feedbucket is clicked", () => {
    useFeedbucketWidgets.mockReturnValue({ data: page([]), isLoading: false });

    render(
      <ProductSettingsFeedbackChannelsSection
        managedProductId={MANAGED_PRODUCT_ID}
      />,
    );

    expect(screen.queryByTestId("collect-dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Configure Feedbucket" }));
    expect(screen.getByTestId("collect-dialog")).toBeInTheDocument();
  });

  it("closes the collect dialog when it requests close", () => {
    useFeedbucketWidgets.mockReturnValue({ data: page([]), isLoading: false });

    render(
      <ProductSettingsFeedbackChannelsSection
        managedProductId={MANAGED_PRODUCT_ID}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Configure Feedbucket" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("collect-dialog")).not.toBeInTheDocument();
  });

  it("shows an error state when the widgets fetch fails", () => {
    useFeedbucketWidgets.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network error"),
      refetch: jest.fn(),
    });

    render(
      <ProductSettingsFeedbackChannelsSection
        managedProductId={MANAGED_PRODUCT_ID}
      />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Could not load feedback channels")).toBeInTheDocument();
  });

  it("does not render the empty state when there is a fetch error", () => {
    useFeedbucketWidgets.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("500"),
      refetch: jest.fn(),
    });

    render(
      <ProductSettingsFeedbackChannelsSection
        managedProductId={MANAGED_PRODUCT_ID}
      />,
    );

    expect(
      screen.queryByText(/No Feedbucket widgets are linked to this product yet/),
    ).not.toBeInTheDocument();
  });

  it("calls refetch when the retry button is clicked after an error", () => {
    const refetch = jest.fn();
    useFeedbucketWidgets.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("fail"),
      refetch,
    });

    render(
      <ProductSettingsFeedbackChannelsSection
        managedProductId={MANAGED_PRODUCT_ID}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });
});
