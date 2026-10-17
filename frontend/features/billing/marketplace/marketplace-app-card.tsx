"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import type { MarketplaceAppAction } from "@/hooks/api/billing/marketplace";
import type { MarketplaceApp } from "@/hooks/api/billing/billing-growth-schema";
import { formatAmountInCurrency } from "@/lib/format-utils";
import { formatShortDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

/** What the backend will accept for this app right now (paid apps install only through a trial). */
function marketplaceAppOffer(app: MarketplaceApp): MarketplaceAppAction | "trialing" | "unavailable" {
  const status = app.installation?.status;
  if (status === "ACTIVE") return "uninstall";
  if (status === "TRIALING") return "trialing";
  if (app.pricingType === "free") return "install";
  if (!app.installation && app.trialDays > 0) return "trial";
  return "unavailable";
}

interface MarketplaceAppCardProps {
  app: MarketplaceApp;
  canInstall: boolean;
  pendingAction: MarketplaceAppAction | null;
  onAction: (action: MarketplaceAppAction, app: MarketplaceApp) => void;
}

export const MarketplaceAppCard = memo(function MarketplaceAppCard({ app, canInstall, pendingAction, onAction }: MarketplaceAppCardProps) {
  const offer = marketplaceAppOffer(app);
  const price = app.pricingType === "free" ? "Free" : `${formatAmountInCurrency(app.monthlyPrice / 100, "INR")} / month`;

  function handleClick() {
    if (offer === "install" || offer === "trial" || offer === "uninstall") onAction(offer, app);
  }

  return (
    <div className={cn(CONTENT_PANEL_SOLID, "flex flex-col gap-3 p-4")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{app.name}</p>
          <p className="text-xs text-muted-foreground">{app.category}</p>
        </div>
        {offer === "uninstall" ? <SemanticBadge tone="success" label="Installed" /> : null}
        {offer === "trialing" ? <SemanticBadge tone="info" label="On trial" /> : null}
      </div>
      {app.description ? <p className="text-sm text-muted-foreground">{app.description}</p> : null}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium tabular-nums">{price}</span>
        {offer === "trialing" && app.installation?.trialEndsAt ? (
          <span className="text-xs text-muted-foreground">Trial ends {formatShortDate(app.installation.trialEndsAt)}</span>
        ) : null}
        {offer === "unavailable" ? <span className="text-xs text-muted-foreground">Purchase not available yet</span> : null}
        {canInstall && offer === "uninstall" ? (
          <Button type="button" size="sm" variant="outline" className="text-xs" onClick={handleClick}>
            Uninstall
          </Button>
        ) : null}
        {canInstall && (offer === "install" || offer === "trial") ? (
          <LoadingButton type="button" size="sm" className="text-xs" isPending={pendingAction === offer} onClick={handleClick}>
            {offer === "install" ? "Install" : `Start ${app.trialDays}-day trial`}
          </LoadingButton>
        ) : null}
      </div>
    </div>
  );
});
