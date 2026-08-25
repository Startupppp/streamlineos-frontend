"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyDevicesIllustration } from "@/components/illustrations";
import { AlertCircle, Plus } from "lucide-react";

const PAGE_TITLE = "Asset Returns";
const PAGE_SUBTITLE = "Track company asset returns";

export function AssetReturnsSkeleton() {
  return (
    <PageWrapper title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
      <div className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-card overflow-hidden">
        <div className="space-y-0 divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 flex gap-4">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-72" />
              </div>
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}

export function AssetReturnsError({ onRetry }: { onRetry: () => void }) {
  return (
    <PageWrapper title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
      <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
        <AlertCircle className="w-8 text-destructive" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Failed to load asset returns
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Something went wrong. Please try again.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </PageWrapper>
  );
}

export function AssetReturnsEmptyState({
  isAdmin,
  onOpenSheet,
}: {
  isAdmin: boolean;
  onOpenSheet: () => void;
}) {
  return (
    <div className="flex flex-1 min-h-0 w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card py-14 px-6 text-center">
      <div className="h-28 w-28">
        <EmptyDevicesIllustration />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">
          No asset returns tracked
        </p>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          Log an asset return when an employee returns company equipment.
        </p>
      </div>
      {isAdmin && (
        <Button size="sm" onClick={onOpenSheet} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Log Return
        </Button>
      )}
    </div>
  );
}
