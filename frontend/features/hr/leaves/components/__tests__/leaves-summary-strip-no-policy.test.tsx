import * as React from "react";
import { render, screen } from "@testing-library/react";

import {
  LeavesSummaryStrip,
  buildAvailableHint,
} from "@/features/hr/leaves/components/leaves-summary-strip";
import type { LeaveBalance } from "@/features/hr/leaves/components/leaves-shared";

/**
 * V-045. "Available Days 0" reads the same for an org with no leave policy and
 * for an org whose 12-day policy nobody has touched yet. Only the first may
 * carry the no-policy copy.
 */
function renderStrip(balances: LeaveBalance[], noPolicyConfigured: boolean) {
  const total = balances.reduce((sum, b) => sum + Number(b.balance ?? 0), 0);
  return render(
    <LeavesSummaryStrip
      totalAvailable={total}
      availableHint={buildAvailableHint(balances, null, noPolicyConfigured)}
      pendingCount={0}
      approvedDays={0}
    />,
  );
}

const CONFIGURED_UNUSED = [
  {
    id: 1,
    leaveTypeId: 1,
    balance: "12",
    typeName: "Casual Leave",
    daysPerYear: 12,
  },
] as LeaveBalance[];

describe("LeavesSummaryStrip — the no-policy copy", () => {
  it("shows the no-policy copy only when no type is configured", () => {
    const { unmount } = renderStrip([], true);
    expect(
      screen.getByText(/No leave policy is set up yet/i),
    ).toBeInTheDocument();
    unmount();

    renderStrip(CONFIGURED_UNUSED, false);
    expect(
      screen.queryByText(/No leave policy is set up yet/i),
    ).not.toBeInTheDocument();
  });

  it("shows balances for a configured policy nobody has used", () => {
    renderStrip(CONFIGURED_UNUSED, false);

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText(/Casual Leave/)).toBeInTheDocument();
    expect(
      screen.queryByText(/No leave policy is set up yet/i),
    ).not.toBeInTheDocument();
  });
});
