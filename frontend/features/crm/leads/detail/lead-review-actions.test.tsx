import { render, screen } from "@testing-library/react";
import { LeadReviewActions } from "./lead-review-actions";

const mockCan = jest.fn<boolean, [string]>();

jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan(key) }));
jest.mock("@/hooks/api/leads", () => ({
  useVerifyLead: () => ({ mutate: jest.fn(), isPending: false }),
  useRejectLead: () => ({ mutate: jest.fn(), isPending: false }),
}));

describe("LeadReviewActions", () => {
  beforeEach(() => mockCan.mockReset());

  it("offers verify and reject to a user who may update leads", () => {
    mockCan.mockReturnValue(true);
    render(<LeadReviewActions leadId={1} status="NEW" verifiedById={null} />);
    expect(mockCan).toHaveBeenCalledWith("crm:leads:update");
    expect(screen.getByRole("button", { name: /verify/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
  });

  it("offers neither without the permission", () => {
    mockCan.mockReturnValue(false);
    render(<LeadReviewActions leadId={1} status="NEW" verifiedById={null} />);
    expect(screen.queryByRole("button", { name: /verify/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reject/i })).not.toBeInTheDocument();
  });

  it("shows the verified state instead of a second verify, and nothing on a closed lead", () => {
    mockCan.mockReturnValue(true);
    const { rerender } = render(<LeadReviewActions leadId={1} status="NEW" verifiedById="user_1" />);
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^verify$/i })).not.toBeInTheDocument();

    rerender(<LeadReviewActions leadId={1} status="LOST" verifiedById={null} />);
    expect(screen.queryByRole("button", { name: /reject/i })).not.toBeInTheDocument();
  });
});
