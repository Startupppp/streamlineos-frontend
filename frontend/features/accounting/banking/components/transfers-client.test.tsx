import type { ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TransfersClient } from "./transfers-client";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/accounting/banking/transfers",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: () => null,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
}));

const mockUseTransfers = jest.fn();

jest.mock("@/hooks/api/accounting/banking", () => ({
  useBankAccounts: () => ({ data: { data: [] }, isLoading: false }),
  useTransfers: (...args: unknown[]) => mockUseTransfers(...args),
}));

jest.mock("./new-transfer-dialog", () => ({
  NewTransferDialog: () => null,
}));

const NEXT_CURSOR = "cursor-abc123";

const PAGE_1 = {
  data: [
    {
      id: "t1",
      transferDate: "2026-08-01T00:00:00.000Z",
      fromBankAccountId: 1,
      toBankAccountId: 2,
      amount: "1000",
      reference: "REF-001",
    },
  ],
  pagination: { hasMore: true, nextCursor: NEXT_CURSOR },
};

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <TooltipProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </TooltipProvider>
  );
}

describe("TransfersClient cursor navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransfers.mockReturnValue({ data: PAGE_1, isLoading: false });
  });

  it("calls useTransfers with cursor undefined on first render", () => {
    render(<TransfersClient />, { wrapper: Wrapper });

    expect(mockUseTransfers).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: undefined }),
    );
  });

  it("sends the cursor returned by page 1 when the user clicks Next", () => {
    render(<TransfersClient />, { wrapper: Wrapper });

    const nextBtn = screen.getByRole("button", { name: "Next" });
    fireEvent.click(nextBtn);

    expect(mockUseTransfers).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: NEXT_CURSOR }),
    );
  });

  it("returns to cursor undefined when Previous is clicked after advancing", () => {
    render(<TransfersClient />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    const prevBtn = screen.getByRole("button", { name: "Previous" });
    expect(prevBtn).not.toBeDisabled();

    fireEvent.click(prevBtn);

    expect(mockUseTransfers).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: undefined }),
    );
  });

  it("Previous button is disabled on the first page", () => {
    render(<TransfersClient />, { wrapper: Wrapper });

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("CursorPageControls is absent when there is only one page", () => {
    mockUseTransfers.mockReturnValue({
      data: {
        data: PAGE_1.data,
        pagination: { hasMore: false, nextCursor: null },
      },
      isLoading: false,
    });

    render(<TransfersClient />, { wrapper: Wrapper });

    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Previous" })).not.toBeInTheDocument();
  });
});
