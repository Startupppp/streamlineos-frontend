import { render, screen } from "@testing-library/react";
import type { Delegation } from "@/hooks/api/delegations";
import { DelegationRow } from "./delegation-row";

const mockOrgTz = jest.fn<string | null, []>();
jest.mock("@/hooks/api/org-display", () => ({
  useOrgTimeZone: () => mockOrgTz(),
}));

const delegation: Delegation = {
  id: "d1",
  orgId: "o1",
  delegatorMembershipId: 1,
  delegateeMembershipId: 2,
  delegateeName: "Asha",
  permissions: ["hr:leave:approve"],
  startsAt: "2026-10-01T00:00:00Z",
  endsAt: "2026-10-20T20:00:00Z",
  reason: null,
  status: "active",
  lifecycle: "ACTIVE",
  createdAt: "2026-10-01T00:00:00Z",
  revokedAt: null,
  revokedBy: null,
};

describe("DelegationRow", () => {
  it("shows the end time in the organisation's time zone, not the browser's", () => {
    mockOrgTz.mockReturnValue("Asia/Kolkata");
    render(<DelegationRow delegation={delegation} memberMap={new Map()} nameField="delegatee" />);
    expect(screen.getByText(/Ends 21 Oct 2026, 01:30:00/)).toBeInTheDocument();
  });

  it("follows a different org zone for the same instant", () => {
    mockOrgTz.mockReturnValue("America/New_York");
    render(<DelegationRow delegation={delegation} memberMap={new Map()} nameField="delegatee" />);
    expect(screen.getByText(/Ends 20 Oct 2026, 16:00:00/)).toBeInTheDocument();
  });
});
