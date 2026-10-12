import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductSettingsFeedbackChannelsSection } from "./product-settings-feedback-channels-section";

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

const OTHER_PRODUCT_WIDGET = {
  id: 3,
  managedProductId: 99,
  name: "Another product",
  isActive: true,
  deletedAt: null,
};

describe("ProductSettingsFeedbackChannelsSection", () => {
  it("renders the section heading", () => {
    useFeedbucketWidgets.mockReturnValue({ data: [], isLoading: false });

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
    useFeedbucketWidgets.mockReturnValue({ data: [OTHER_PRODUCT_WIDGET], isLoading: false });

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
      data: [ACTIVE_WIDGET, OTHER_PRODUCT_WIDGET],
      isLoading: false,
    });

    render(
      <ProductSettingsFeedbackChannelsSection
        managedProductId={MANAGED_PRODUCT_ID}
      />,
    );

    expect(screen.getByText("Product feedback")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.queryByText("Another product")).not.toBeInTheDocument();
  });

  it("shows Inactive badge for a paused widget", () => {
    useFeedbucketWidgets.mockReturnValue({
      data: [INACTIVE_WIDGET],
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

  it("excludes deleted widgets from the list", () => {
    useFeedbucketWidgets.mockReturnValue({
      data: [{ ...ACTIVE_WIDGET, deletedAt: "2026-01-01T00:00:00Z" }],
      isLoading: false,
    });

    render(
      <ProductSettingsFeedbackChannelsSection
        managedProductId={MANAGED_PRODUCT_ID}
      />,
    );

    expect(
      screen.getByText(/No Feedbucket widgets are linked to this product yet/),
    ).toBeInTheDocument();
  });

  it("opens the collect dialog when Configure Feedbucket is clicked", () => {
    useFeedbucketWidgets.mockReturnValue({ data: [], isLoading: false });

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
    useFeedbucketWidgets.mockReturnValue({ data: [], isLoading: false });

    render(
      <ProductSettingsFeedbackChannelsSection
        managedProductId={MANAGED_PRODUCT_ID}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Configure Feedbucket" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("collect-dialog")).not.toBeInTheDocument();
  });
});
