"use client";

import { formatDistanceToNow } from "date-fns";
import { ListPlus, SearchX, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { PM_PANEL } from "@/components/pm-chrome";

interface OfflineEmptyStateProps {
  dataUpdatedAt?: number;
}

export function OfflineEmptyState({ dataUpdatedAt }: OfflineEmptyStateProps) {
  return (
    <div className="relative flex h-full flex-1 flex-col items-center justify-center py-12">
      <div
        className={cn(
          PM_PANEL,
          "relative flex w-full max-w-sm flex-col items-center gap-3 px-6 py-8 text-center",
        )}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-primary/[0.06] shadow-sm">
          <WifiOff className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            You&apos;re offline
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Results may not be up to date. Reconnect to see the latest tickets.
          </p>
          {dataUpdatedAt !== undefined ? (
            <p className="text-xs text-muted-foreground">
              Last updated {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function FirstRunEmptyState() {
  return (
    <EmptyState
      illustration={<ListPlus className="h-5 w-5 text-muted-foreground" />}
      illustrationSize="xs"
      title="No tickets yet"
      description="Create the first ticket to start tracking work on this project."
    />
  );
}

interface FilteredEmptyStateProps {
  onClearSearch: () => void;
}

export function FilteredEmptyState({ onClearSearch }: FilteredEmptyStateProps) {
  return (
    <div className="relative flex h-full flex-1 flex-col items-center justify-center py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-6 right-1/4 h-36 w-36 rounded-full bg-primary/[0.06] blur-3xl"
      />
      <div
        className={cn(
          PM_PANEL,
          "relative flex w-full max-w-sm flex-col items-center gap-3 px-6 py-8 text-center",
        )}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-primary/[0.06] shadow-sm">
          <SearchX className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">No tickets match your filters</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Try adjusting your search or filters to find what you&apos;re looking for.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClearSearch}
          className="mt-0.5 h-8 border-border/70 bg-background/60 text-xs backdrop-blur-sm"
        >
          Clear all filters
        </Button>
      </div>
    </div>
  );
}
