"use client";

import { useMemo } from "react";
import { Megaphone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useProductUpdates } from "@/hooks/api/build/managed-product-updates";
import { formatRelativeTime } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { OverviewPanel } from "./overview-metric";

const LATEST_UPDATE_COUNT = 3;

interface UpdatesCardProps {
  managedProductId: number;
}

export function ManagedProductOverviewUpdatesCard({ managedProductId }: UpdatesCardProps) {
  const { data, isLoading, isError, error, refetch } = useProductUpdates(managedProductId);
  const updates = useMemo(() => (data?.data ?? []).slice(0, LATEST_UPDATE_COUNT), [data?.data]);

  function handleRetry() {
    void refetch();
  }

  return (
    <OverviewPanel title="Product updates" description="The latest status updates posted for the team.">
      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError ? (
        <ErrorState
          compact
          title="Could not load product updates"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
          error={error}
        />
      ) : updates.length === 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted p-3 dark:border-background">
          <Megaphone aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-pretty text-xs text-muted-foreground">
            No updates posted yet. Use Post update to share where this product stands.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {updates.map((update) => (
            <li key={update.id} className="flex flex-col gap-1 border-b border-border py-3 first:pt-0 last:border-b-0">
              <p className="whitespace-pre-wrap break-words text-sm text-foreground">{update.body}</p>
              <p className="text-xs text-muted-foreground">
                {update.authorName} · <time dateTime={update.createdAt}>{formatRelativeTime(update.createdAt)}</time>
              </p>
            </li>
          ))}
        </ul>
      )}
    </OverviewPanel>
  );
}
