import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useSeatInfo } from "@/hooks/api/subscription";
import { InviteSeatNotice } from "./invite-seat-notice";

jest.mock("@/hooks/api/subscription", () => ({
  useSeatInfo: jest.fn(),
}));

const mockedSeats = useSeatInfo as jest.Mock;

function renderNotice(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("BUG-HRMS-001: invite seat notice", () => {
  it("reports seats used, not the plan limit, as in use", async () => {
    mockedSeats.mockReturnValue({
      data: { total: 10, used: 12, available: 0, activeMembers: 10, pendingInvitations: 2 },
    });
    const user = userEvent.setup();

    renderNotice(<InviteSeatNotice />);

    const trigger = screen.getByRole("button", { name: /12 of 10 in use/ });
    await user.hover(trigger);

    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      /each pending invitation takes one seat/i,
    );
  });

  it("states free seats when some remain", async () => {
    mockedSeats.mockReturnValue({
      data: { total: 10, used: 7, available: 3, activeMembers: 7, pendingInvitations: 0 },
    });
    const user = userEvent.setup();

    renderNotice(<InviteSeatNotice requesting={1} />);

    const trigger = screen.getByRole("button", { name: /3 of 10 seats free/ });
    await user.hover(trigger);

    expect(await screen.findByRole("tooltip")).toHaveTextContent(/3 of 10 seats free/);
  });
});
