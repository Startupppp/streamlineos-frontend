"use client";

import { CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { EmptyState } from "@/components/ui/empty-state";

interface AllWorkEmptyStateProps {
  isOnline: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function AllWorkEmptyState({ isOnline, hasActiveFilters, onClearFilters }: AllWorkEmptyStateProps) {
  if (!isOnline) {
    return (
      <EmptyState
        className={CONTENT_FILL_PANEL}
        illustrationPreset="projects"
        title="You are offline"
        description="Showing cached data. Reconnect to see the latest tickets."
      />
    );
  }
  return (
    <EmptyState
      className={CONTENT_FILL_PANEL}
      illustrationPreset="projects"
      title="No tickets yet"
      description={hasActiveFilters ? undefined : "Start by creating a ticket in any project."}
      filtersActive={hasActiveFilters}
      onClearFilters={onClearFilters}
      action={!hasActiveFilters ? { label: "All Projects", href: "/build/projects" } : undefined}
    />
  );
}

interface AllWorkExpandBannerProps {
  show: boolean;
  loadedCount: number;
  idsSnapshot: { total: number; capped: boolean; cap: number } | null | undefined;
  onExpandToAll: () => void;
}

export function AllWorkExpandBanner({
  show,
  loadedCount,
  idsSnapshot,
  onExpandToAll,
}: AllWorkExpandBannerProps) {
  if (!show) return null;
  return (
    <div className="flex items-center justify-center gap-2 rounded-md border border-dashed bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
      <span>{loadedCount} tickets on this page selected.</span>
      <button
        type="button"
        className="font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
        onClick={onExpandToAll}
        disabled={!idsSnapshot}
      >
        {idsSnapshot
          ? `Select all ${idsSnapshot.capped ? `${idsSnapshot.cap}+` : idsSnapshot.total} matching tickets`
          : "Loading…"}
      </button>
    </div>
  );
}
