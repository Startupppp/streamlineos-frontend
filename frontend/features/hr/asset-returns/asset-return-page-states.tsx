"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyDevicesIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";

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
      <ErrorState className="flex-1" title="Failed to load asset returns" onRetry={onRetry} />
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
    <EmptyState
      className="flex-1"
      illustration={<EmptyDevicesIllustration />}
      title="No asset returns tracked"
      description="Log an asset return when an employee returns company equipment."
      action={isAdmin ? { label: "Log Return", onClick: onOpenSheet } : undefined}
    />
  );
}
