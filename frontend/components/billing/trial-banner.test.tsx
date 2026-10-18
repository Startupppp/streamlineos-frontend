import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrialBanner } from "./trial-banner";
import { formatTrialDaysLeft, formatTrialEndDate, trialDaysRemaining } from "./trial-end";

jest.mock("@/hooks/api/org-display", () => ({
  useOrgTimeZone: () => "Asia/Calcutta",
}));

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

describe("trial end wording matches Billing (ORG UX plan copy)", () => {
  it("shows the same end date Billing shows, in the org time zone, with the days left", () => {
    render(<TrialBanner />);
    const region = screen.getByRole("region", { name: "Trial expiry notice" });
    const trialEndsAt = new Date(Date.now() + 5 * 86_400_000).toISOString();
    const date = formatTrialEndDate(trialEndsAt, "Asia/Calcutta");
    expect(region).toHaveTextContent(`Trial ends ${date} (5 days left)`);
  });

  it("formats the shared parts Billing and the banner both use", () => {
    expect(formatTrialEndDate("2026-10-25T20:00:00.000Z", "Asia/Calcutta")).toBe("26 Oct 2026");
    expect(formatTrialEndDate("2026-10-25T20:00:00.000Z", "UTC")).toBe("25 Oct 2026");
    expect(trialDaysRemaining("2026-10-26T00:00:00.000Z", Date.parse("2026-10-15T00:00:00.000Z"))).toBe(11);
    expect(formatTrialDaysLeft(1)).toBe("1 day left");
    expect(formatTrialDaysLeft(0)).toBe("ends today");
  });
});
