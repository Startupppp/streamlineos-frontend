import { render, screen } from "@testing-library/react";

import { useSeatInfo } from "@/hooks/api/subscription";
import { InviteSeatNotice } from "./invite-seat-notice";

jest.mock("@/hooks/api/subscription", () => ({
  useSeatInfo: jest.fn(),
}));

const mockedSeats = useSeatInfo as jest.Mock;

describe("BUG-HRMS-001: invite seat notice", () => {
  it("reports seats used, not the plan limit, as in use", () => {
    mockedSeats.mockReturnValue({
      data: { total: 10, used: 12, available: 0, activeMembers: 10, pendingInvitations: 2 },
    });

    render(<InviteSeatNotice />);

    expect(screen.getByText(/12 of 10 in use/)).toBeInTheDocument();
    expect(screen.getByText(/each pending invitation takes one seat/i)).toBeInTheDocument();
  });

  it("states free seats when some remain", () => {
    mockedSeats.mockReturnValue({
      data: { total: 10, used: 7, available: 3, activeMembers: 7, pendingInvitations: 0 },
    });

    render(<InviteSeatNotice requesting={1} />);

    expect(screen.getByText(/3 of 10 seats free/)).toBeInTheDocument();
  });
});
