import { render, screen } from "@testing-library/react";
import { IncomingTransferPage } from "./incoming-transfer-page";

let mockTransfers: { data: unknown; isLoading: boolean; isPending: boolean; isError: boolean };

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ isPending: false }),
}));

jest.mock("@/hooks/api/ownership", () => ({
  useIncomingOrgTransfers: () => ({ ...mockTransfers, error: null, refetch: jest.fn() }),
}));

jest.mock("@/features/settings/organization/org-incoming-transfer-section", () => ({
  OrgIncomingTransferSection: () => <div>transfer rows</div>,
}));

describe("IncomingTransferPage", () => {
  it("shows the empty state when the transfers read never runs instead of a skeleton that never resolves", () => {
    mockTransfers = { data: undefined, isLoading: false, isPending: true, isError: false };
    render(<IncomingTransferPage />);
    expect(screen.getByText("No pending ownership transfer")).toBeInTheDocument();
  });

  it("shows the empty state when there are no transfers", () => {
    mockTransfers = { data: { data: [] }, isLoading: false, isPending: false, isError: false };
    render(<IncomingTransferPage />);
    expect(screen.getByText("No pending ownership transfer")).toBeInTheDocument();
  });
});
