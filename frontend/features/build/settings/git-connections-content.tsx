"use client";

import type { RefObject } from "react";
import { cn } from "@/lib/utils";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDevicesIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PmStaggerList, CONTENT_FILL_PANEL, PM_PANEL } from "@/components/pm-chrome";
import { ConnectionRow } from "./git-connection-row";
import type { GitConnection } from "@/hooks/api/git-integration";

interface GitConnectionsContentProps {
  isLoading: boolean;
  isError: boolean;
  isOnline: boolean;
  isFiltered: boolean;
  connections: GitConnection[];
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  activeFilterCount: number;
  onClearFilters: () => void;
  onOpenDialog: () => void;
  onToggle: (connection: GitConnection) => void;
  onDelete: (id: number) => void;
  isToggling: boolean;
  onRetry: () => void;
}

export function GitConnectionsContent({
  isLoading,
  isError,
  isOnline,
  isFiltered,
  connections,
  searchValue,
  onSearchChange,
  searchInputRef,
  activeFilterCount,
  onClearFilters,
  onOpenDialog,
  onToggle,
  onDelete,
  isToggling,
  onRetry,
}: GitConnectionsContentProps) {
  return (
    <>
      <BuildListToolbar
        className="mb-4"
        search={{
          value: searchValue,
          onValueChange: onSearchChange,
          placeholder: "Search connections…",
          inputRef: searchInputRef,
        }}
        onClearAll={activeFilterCount > 0 ? onClearFilters : undefined}
      />
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={cn(PM_PANEL, "space-y-3 p-4")}>
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          className={CONTENT_FILL_PANEL}
          title="Could not load connections"
          description="There was a problem loading your Git connections."
          onRetry={onRetry}
        />
      ) : connections.length === 0 ? (
        !isOnline ? (
          <EmptyState
            className={CONTENT_FILL_PANEL}
            illustration={<EmptyDevicesIllustration />}
            title="You are offline"
            description="Git connections cannot be modified while offline."
          />
        ) : (
          <EmptyState
            className={CONTENT_FILL_PANEL}
            illustration={<EmptyDevicesIllustration />}
            title={
              isFiltered ? "No matching connections" : "No repositories connected"
            }
            description={
              isFiltered
                ? undefined
                : "Connect GitHub, GitLab, or Bitbucket to link commits and PRs to your tickets."
            }
            filtersActive={isFiltered}
            onClearFilters={isFiltered ? onClearFilters : undefined}
            action={
              !isFiltered
                ? { label: "Add connection", onClick: onOpenDialog }
                : undefined
            }
          />
        )
      ) : (
        <PmStaggerList className="space-y-3">
          {connections.map((connection) => (
            <ConnectionRow
              key={connection.id}
              connection={connection}
              onToggle={onToggle}
              onDelete={onDelete}
              isToggling={isToggling}
            />
          ))}
        </PmStaggerList>
      )}
    </>
  );
}
