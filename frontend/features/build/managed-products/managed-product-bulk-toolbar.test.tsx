import { render, screen, fireEvent } from "@testing-library/react";
import { ManagedProductBulkToolbar, MANAGED_PRODUCT_BULK_MAX } from "./managed-product-bulk-toolbar";

const mockMutateBulk = jest.fn();
const mockUseBulkUpdateManagedProducts = jest.fn();

jest.mock("@/hooks/api/build", () => ({
  useBulkUpdateManagedProducts: () => mockUseBulkUpdateManagedProducts(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({
    children,
    onClick,
    disabled,
    isPending,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    isPending?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isPending}
      data-testid="apply-button"
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick} data-testid="clear-button">
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <div data-testid="status-select" data-value={value}>
      {children}
      <button
        type="button"
        data-testid="select-active"
        onClick={() => onValueChange?.("active")}
      />
      <button
        type="button"
        data-testid="select-archived"
        onClick={() => onValueChange?.("archived")}
      />
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseBulkUpdateManagedProducts.mockReturnValue({
    mutate: mockMutateBulk,
    isPending: false,
  });
});

function renderToolbar(selectedIds = [1, 2, 3], onClearSelection = jest.fn()) {
  return render(
    <ManagedProductBulkToolbar
      selectedIds={selectedIds}
      onClearSelection={onClearSelection}
    />,
  );
}

describe("ManagedProductBulkToolbar — S1 bulk action bar (C3)", () => {
  it("shows the count of selected products", () => {
    renderToolbar([1, 2, 3]);
    expect(screen.getByText(/3 selected/i)).toBeInTheDocument();
  });

  it("apply button is disabled when no status is selected", () => {
    renderToolbar();
    expect(screen.getByTestId("apply-button")).toBeDisabled();
  });

  it("calls useBulkUpdateManagedProducts mutate with selected ids and status when apply is clicked", () => {
    const onClear = jest.fn();
    renderToolbar([1, 2], onClear);

    fireEvent.click(screen.getByTestId("select-archived"));
    fireEvent.click(screen.getByTestId("apply-button"));

    expect(mockMutateBulk).toHaveBeenCalledWith(
      { ids: [1, 2], action: "update_status", status: "archived" },
      expect.any(Object),
    );
  });

  it("calls onClearSelection when Clear button is clicked", () => {
    const onClear = jest.fn();
    renderToolbar([1], onClear);
    fireEvent.click(screen.getByTestId("clear-button"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it(`caps displayed ids at ${MANAGED_PRODUCT_BULK_MAX} and shows a cap indicator when exceeded`, () => {
    const ids = Array.from({ length: MANAGED_PRODUCT_BULK_MAX + 1 }, (_, i) => i + 1);
    renderToolbar(ids);
    expect(screen.getByText(new RegExp(`capped at ${MANAGED_PRODUCT_BULK_MAX}`))).toBeInTheDocument();
  });

  it("passes only capped ids to the mutate call when selection exceeds cap", () => {
    const onClear = jest.fn();
    const ids = Array.from({ length: MANAGED_PRODUCT_BULK_MAX + 5 }, (_, i) => i + 1);
    renderToolbar(ids, onClear);

    fireEvent.click(screen.getByTestId("select-active"));
    fireEvent.click(screen.getByTestId("apply-button"));

    const call = mockMutateBulk.mock.calls[0][0] as { ids: number[] };
    expect(call.ids).toHaveLength(MANAGED_PRODUCT_BULK_MAX);
  });
});
