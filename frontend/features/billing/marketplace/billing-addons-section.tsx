"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { ErrorState } from "@/components/shared/error-state";
import { useBillingAddons } from "@/hooks/api/billing/marketplace";
import { formatAmountInCurrency } from "@/lib/format-utils";
import { cn } from "@/lib/utils";

/**
 * The add-on catalog. Only AI credit packs are purchasable, and they are bought on the
 * AI credits page, which owns that checkout and its verification; the rest are listed
 * as the backend reports them, unavailable.
 */
export function BillingAddonsSection() {
  const { data, isLoading, isError, error, refetch } = useBillingAddons();

  function handleRetry() {
    void refetch();
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }
  if (isError) {
    return <ErrorState compact title="Failed to load add-ons" error={error} onRetry={handleRetry} />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {(data?.addons ?? []).map((addon) => (
        <div key={addon.id} className={cn(CONTENT_PANEL_SOLID, "flex flex-col gap-2 p-4")}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{addon.name}</p>
            {addon.available ? null : <SemanticBadge tone="neutral" label="Coming soon" />}
          </div>
          <p className="text-sm text-muted-foreground">{addon.description}</p>
          <div className="mt-auto flex items-center justify-between gap-2">
            {addon.priceInPaise !== undefined ? (
              <span className="text-sm tabular-nums">{formatAmountInCurrency(addon.priceInPaise / 100, "INR")}</span>
            ) : (
              <span />
            )}
            {addon.available && addon.href ? (
              <Link href={addon.href} className="text-sm font-medium text-primary hover:underline">
                Open
              </Link>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
