import { fireEvent, render, screen } from "@testing-library/react";
import { MarketplaceAppCard } from "./marketplace-app-card";
import type { MarketplaceApp } from "@/hooks/api/billing/billing-growth-schema";

const app = (overrides: Partial<MarketplaceApp> = {}): MarketplaceApp => ({
  id: 1,
  slug: "crm-sync",
  name: "CRM Sync",
  description: null,
  category: "integrations",
  iconUrl: null,
  screenshotUrls: null,
  features: null,
  pricingType: "free",
  monthlyPrice: 0,
  annualPrice: 0,
  trialDays: 0,
  isActive: true,
  sortOrder: 1,
  requiredPlan: null,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  installation: null,
  ...overrides,
});

const installation = (status: string) => ({
  id: 9,
  orgId: "org",
  appId: 1,
  installedBy: "u",
  status,
  trialEndsAt: "2026-10-31T00:00:00Z",
  installedAt: "2026-10-17T00:00:00Z",
  cancelledAt: null,
});

function renderCard(appValue: MarketplaceApp, canInstall = true) {
  const onAction = jest.fn();
  render(<MarketplaceAppCard app={appValue} canInstall={canInstall} pendingAction={null} onAction={onAction} />);
  return onAction;
}

describe("MarketplaceAppCard", () => {
  it("installs a free app", () => {
    const onAction = renderCard(app());
    fireEvent.click(screen.getByRole("button", { name: "Install" }));
    expect(onAction).toHaveBeenCalledWith("install", expect.objectContaining({ id: 1 }));
  });

  it("offers only a trial on a paid app, and nothing when it has no trial", () => {
    const onAction = renderCard(app({ pricingType: "paid", monthlyPrice: 49_900, trialDays: 14 }));
    expect(screen.queryByRole("button", { name: "Install" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Start 14-day trial" }));
    expect(onAction).toHaveBeenCalledWith("trial", expect.anything());
  });

  it("says a paid app without a trial cannot be bought yet", () => {
    renderCard(app({ pricingType: "paid", monthlyPrice: 49_900, trialDays: 0 }));
    expect(screen.getByText("Purchase not available yet")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("offers uninstall on an installed app and shows trial end on a trial", () => {
    const onAction = renderCard(app({ installation: installation("ACTIVE") }));
    fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));
    expect(onAction).toHaveBeenCalledWith("uninstall", expect.anything());
  });

  it("renders no controls without the install key", () => {
    renderCard(app(), false);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
