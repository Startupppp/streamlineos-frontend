import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrialBanner } from "./trial-banner";

jest.mock("@/hooks/api/subscription", () => ({
  useSubscription: () => ({
    data: {
      subscription: {
        status: "TRIAL",
        trialEndsAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      },
    },
    isLoading: false,
    isError: false,
  }),
}));

describe("trial banner keyboard affordances (HRMS-027)", () => {
  it("names where the upgrade link goes, so a keyboard user knows Enter opens billing", () => {
    render(<TrialBanner />);
    const upgrade = screen.getByRole("link", { name: "Upgrade now, opens billing plans" });
    expect(upgrade).toHaveAttribute("href", "/settings/billing?tab=plan");
  });

  it("draws a visible focus ring on both banner controls instead of a ring that blends into the warning surface", async () => {
    const user = userEvent.setup();
    render(<TrialBanner />);
    const upgrade = screen.getByRole("link", { name: "Upgrade now, opens billing plans" });
    const dismiss = screen.getByRole("button", { name: "Dismiss trial notice" });

    await user.tab();
    expect(upgrade).toHaveFocus();
    expect(upgrade.className).toContain("focus-visible:ring-status-warning-ink");
    await user.tab();
    expect(dismiss).toHaveFocus();
    expect(dismiss.className).toContain("focus-visible:ring-status-warning-ink");
    expect(dismiss.className).not.toContain("hover:bg-status-warning-surface");
  });
});
