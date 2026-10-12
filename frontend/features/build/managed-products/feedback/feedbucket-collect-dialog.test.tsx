import { fireEvent, render, screen } from "@testing-library/react";
import { FeedbucketCollectDialog } from "./feedbucket-collect-dialog";

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockUseWidgets = jest.fn();
const mockUseCan = jest.fn();

jest.mock("@/hooks/api/feedbucket/use-feedbucket-widgets", () => ({
  useFeedbucketWidgets: (...args: unknown[]) => mockUseWidgets(...args),
  useCreateFeedbucketWidget: () => ({ mutate: mockCreate, isPending: false }),
  useUpdateFeedbucketWidget: () => ({ mutate: mockUpdate, isPending: false }),
}));

jest.mock("@/hooks/api/build/managed-products", () => ({
  useManagedProduct: () => ({ data: { id: 39, name: "Build QA Sandbox" } }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
}));

jest.mock("@/lib/feedbucket", () => ({
  buildFeedbucketEmbedSnippet: ({ publicKey }: { publicKey: string }) => `<script data-key="${publicKey}"></script>`,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const PAGINATION = { limit: 50, hasMore: false, nextCursor: null };

function aPage(rows: { id: number; name: string; managedProductId: number; isActive: boolean; deletedAt: null; publicKey: string }[]) {
  return { data: rows, pagination: PAGINATION };
}

const INTERNAL = { id: 7, name: "Product capture", managedProductId: 39, isActive: false, deletedAt: null, publicKey: "fb_internal" };
const PAUSED = { id: 8, name: "Site feedback", managedProductId: 39, isActive: false, deletedAt: null, publicKey: "fb_paused" };
const ACTIVE = { id: 9, name: "Site feedback", managedProductId: 39, isActive: true, deletedAt: null, publicKey: "fb_active" };

function renderDialog() {
  return render(<FeedbucketCollectDialog managedProductId={39} open onOpenChange={jest.fn()} />);
}

beforeEach(() => {
  mockCreate.mockReset();
  mockUpdate.mockReset();
  mockUseCan.mockReturnValue(true);
});

describe("FeedbucketCollectDialog", () => {
  it("shows the embed snippet for an active product widget", () => {
    mockUseWidgets.mockReturnValue({ data: aPage([ACTIVE]), isLoading: false });
    renderDialog();
    expect(screen.getByText('<script data-key="fb_active"></script>')).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create product widget" })).not.toBeInTheDocument();
  });

  it("creates a product-linked widget when only the internal capture widget exists", () => {
    mockUseWidgets.mockReturnValue({ data: aPage([INTERNAL]), isLoading: false });
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Create product widget" }));
    expect(mockCreate).toHaveBeenCalledWith(
      { name: "Build QA Sandbox feedback", managedProductId: 39 },
      expect.any(Object),
    );
    expect(screen.queryByText(/fb_internal/)).not.toBeInTheDocument();
  });

  it("activates a paused product widget instead of creating another", () => {
    mockUseWidgets.mockReturnValue({ data: aPage([INTERNAL, PAUSED]), isLoading: false });
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Activate widget" }));
    expect(mockUpdate).toHaveBeenCalledWith({ widgetId: 8, input: { isActive: true } }, expect.any(Object));
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("hides the create action without widget create permission", () => {
    mockUseCan.mockReturnValue(false);
    mockUseWidgets.mockReturnValue({ data: aPage([]), isLoading: false });
    renderDialog();
    expect(screen.queryByRole("button", { name: "Create product widget" })).not.toBeInTheDocument();
    expect(screen.getByText(/Ask an admin with Feedbucket access to create/)).toBeInTheDocument();
  });

  it("passes managedProductId to useFeedbucketWidgets so the query is product-scoped", () => {
    mockUseWidgets.mockReturnValue({ data: aPage([]), isLoading: false });
    renderDialog();
    expect(mockUseWidgets).toHaveBeenCalledWith({ managedProductId: 39 });
  });
});
