"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Package, Store } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useInstallApp,
  useMarketplace,
  useStartAppTrial,
  useUninstallApp,
} from "@/hooks/api/marketplace";
import type { MarketplaceApp } from "@/hooks/api/marketplace";

const CATEGORIES = [
  "All",
  "Sales",
  "People",
  "Operations",
  "Finance",
  "Support",
  "AI",
] as const;
type Category = (typeof CATEGORIES)[number];

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function AppCard({ app }: { app: MarketplaceApp }) {
  const install = useInstallApp();
  const uninstall = useUninstallApp();
  const startTrial = useStartAppTrial();

  const inst = app.installation;
  const isActive = inst?.status === "ACTIVE";
  const isTrialing = inst?.status === "TRIALING";

  function handleInstall() {
    install.mutate(app.id);
  }

  function handleUninstall() {
    uninstall.mutate(app.id);
  }

  function handleTrial() {
    startTrial.mutate(app.id);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          {app.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={app.iconUrl}
              alt={app.name}
              className="h-8 w-8 object-contain"
            />
          ) : (
            <Package className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold truncate">{app.name}</p>
            {isActive && (
              <Badge variant="default" className="text-[10px] gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Installed
              </Badge>
            )}
            {isTrialing && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Clock className="h-2.5 w-2.5" /> Trial
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {app.description}
          </p>
        </div>
      </div>

      {app.features.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {app.features.slice(0, 3).map((f) => (
            <span
              key={f}
              className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5"
            >
              {f}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <div>
          {app.pricingType === "free" ? (
            <span className="text-xs font-medium text-green-600">Free</span>
          ) : (
            <span className="text-xs font-medium">
              {fmt(app.monthlyPrice)}
              <span className="text-muted-foreground font-normal">/mo</span>
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          {isActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUninstall}
              disabled={uninstall.isPending}
            >
              Uninstall
            </Button>
          ) : isTrialing ? (
            <Button variant="outline" size="sm" disabled>
              Trialing
            </Button>
          ) : (
            <>
              {app.trialDays > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTrial}
                  disabled={startTrial.isPending}
                >
                  Try {app.trialDays}d free
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleInstall}
                disabled={install.isPending}
              >
                Install
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const [category, setCategory] = useState<Category>("All");
  const { data: apps, isLoading, isError, refetch } = useMarketplace();

  const filtered = apps
    ? category === "All"
      ? apps
      : apps.filter(
          (a) => a.category.toLowerCase() === category.toLowerCase(),
        )
    : [];

  return (
    <PageWrapper
      title="Marketplace"
      subtitle="Extend StreamlineOS with apps and integrations"
    >
      <div className="space-y-4">
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                category === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive mb-2">
              Failed to load marketplace
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-4 space-y-3"
              >
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            illustration={<Store />}
            title="No apps in this category"
            description="Check back soon for new integrations."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
