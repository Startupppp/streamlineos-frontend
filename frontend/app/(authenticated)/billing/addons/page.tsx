"use client";

import Link from "next/link";
import {
  Package,
  Zap,
  HardDrive,
  MessageSquare,
  Phone,
  Mic,
  Tag,
  Globe,
  Server,
  Headphones,
} from "lucide-react";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAddons } from "@/hooks/api/addons";

const ICON_MAP: Record<string, LucideIcon> = {
  Zap,
  HardDrive,
  MessageSquare,
  Phone,
  Mic,
  Tag,
  Globe,
  Server,
  Headphones,
};

function handleAddToPlan() {
  toast.info("Contact sales to add this addon");
}

function AddonCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-3">
      <Skeleton className="h-8 w-8 rounded-md" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  );
}

export default function AddonsPage() {
  const { data, isLoading, isError, error, refetch } = useAddons();
  const addons = data?.addons ?? [];

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper
      title="Add-ons"
      subtitle="Extend your platform with additional capabilities"
    >
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <AddonCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to load add-ons"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : addons.length === 0 ? (
        <EmptyState
          illustrationPreset="report"
          title="No add-ons available"
          description="Check back soon for new capabilities"
          className="flex-1"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {addons.map((addon) => {
            const Icon = ICON_MAP[addon.icon] ?? Package;
            const isComingSoon = addon.comingSoon === true;
            const hasHref = typeof addon.href === "string" && addon.href.length > 0;

            return (
              <div
                key={addon.id}
                className={`rounded-lg border border-border bg-card p-5 flex flex-col gap-3 transition-opacity ${
                  isComingSoon ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-muted p-2 shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {isComingSoon && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      Coming Soon
                    </Badge>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold leading-tight">{addon.name}</p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {addon.description}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium tabular-nums">
                    {hasHref
                      ? "See pricing"
                      : `₹${(addon.priceInPaise / 100).toLocaleString("en-IN")}/mo`}
                  </p>
                  {isComingSoon ? (
                    <Button size="sm" variant="outline" disabled>
                      Coming Soon
                    </Button>
                  ) : hasHref && addon.href ? (
                    <Button size="sm" asChild>
                      <Link href={addon.href}>Manage Credits</Link>
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleAddToPlan}>
                      Add to Plan
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
