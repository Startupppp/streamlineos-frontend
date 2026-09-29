"use client";

import { WifiOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  PmStaggerList,
  CONTENT_FILL_PANEL,
  PM_FILL_SECTION,
} from "@/components/pm-chrome";
import { EpicCard, type EpicCardProps } from "@/features/build/epics/epic-card";

interface EpicsListSectionProps {
  epics: Array<EpicCardProps["epic"] & { dependencyCount?: number }>;
  tickets: EpicCardProps["stories"];
  unlinkedStories: EpicCardProps["unlinkedStories"];
  projectId: number;
  projectKey?: EpicCardProps["projectKey"];
  projectStatuses?: EpicCardProps["projectStatuses"];
  isOnline: boolean;
  epicsUpdatedAt?: number | null;
  canCreate: boolean;
  canUpdate: boolean;
  isFiltered: boolean;
  selectedIds: Set<string | number>;
  hasMore: boolean;
  hasPrevious: boolean;
  isDeleting: boolean;
  onClearFilters: () => void;
  onOpenCreate: () => void;
  onEpicSelection: (id: number) => void;
  onDeleteEpic: EpicCardProps["onDeleteEpic"];
  onLinkStory: EpicCardProps["onLinkStory"];
  onCreateStory: EpicCardProps["onCreateStory"];
  onNextPage: () => void;
  onPreviousPage: () => void;
}

export function EpicsListSection({
  epics,
  tickets,
  unlinkedStories,
  projectId,
  projectKey,
  projectStatuses,
  isOnline,
  epicsUpdatedAt,
  canCreate,
  canUpdate,
  isFiltered,
  selectedIds,
  hasMore,
  hasPrevious,
  isDeleting,
  onClearFilters,
  onOpenCreate,
  onEpicSelection,
  onDeleteEpic,
  onLinkStory,
  onCreateStory,
  onNextPage,
  onPreviousPage,
}: EpicsListSectionProps) {
  const showPager = epics.length > 0 || hasPrevious;

  return (
    <div className={PM_FILL_SECTION}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {epics.length === 0 && !isOnline ? (
          <div
            className={cn(
              CONTENT_FILL_PANEL,
              "flex flex-col items-center justify-center gap-2 text-center",
            )}
            data-testid="offline-state"
          >
            <WifiOff className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              You&apos;re offline
            </p>
            <p className="text-xs text-muted-foreground">
              Results may not be up to date. Reconnect to see the latest epics.
            </p>
            {epicsUpdatedAt ? (
              <p
                className="text-xs text-muted-foreground"
                data-testid="offline-freshness"
              >
                Last updated{" "}
                {formatDistanceToNow(new Date(epicsUpdatedAt), {
                  addSuffix: true,
                })}
              </p>
            ) : null}
          </div>
        ) : epics.length === 0 ? (
          <EmptyState
            className={CONTENT_FILL_PANEL}
            illustrationPreset="projects"
            title={isFiltered ? "No epics match your filters" : "No epics yet"}
            description={
              isFiltered
                ? undefined
                : "Create your first epic to organize related stories and tasks."
            }
            filtersActive={isFiltered}
            onClearFilters={onClearFilters}
            action={
              isFiltered || !canCreate
                ? undefined
                : { label: "Create Epic", onClick: onOpenCreate }
            }
          />
        ) : (
          <PmStaggerList className="space-y-2.5">
            {epics.map((epic) => (
              <EpicRow
                key={epic.id}
                epic={epic}
                tickets={tickets}
                unlinkedStories={unlinkedStories}
                projectId={projectId}
                projectKey={projectKey}
                projectStatuses={projectStatuses}
                canUpdate={canUpdate}
                selected={selectedIds.has(epic.id)}
                isDeleting={isDeleting}
                onEpicSelection={onEpicSelection}
                onDeleteEpic={onDeleteEpic}
                onLinkStory={onLinkStory}
                onCreateStory={onCreateStory}
              />
            ))}
          </PmStaggerList>
        )}
      </div>
      {showPager ? (
        <TablePagination
          mode="cursor"
          rowCount={epics.length}
          hasMore={hasMore}
          hasPrevious={hasPrevious}
          onNext={onNextPage}
          onPrevious={onPreviousPage}
        />
      ) : null}
    </div>
  );
}

interface EpicRowProps {
  epic: EpicCardProps["epic"] & { dependencyCount?: number };
  tickets: EpicCardProps["stories"];
  unlinkedStories: EpicCardProps["unlinkedStories"];
  projectId: number;
  projectKey?: EpicCardProps["projectKey"];
  projectStatuses?: EpicCardProps["projectStatuses"];
  canUpdate: boolean;
  selected: boolean;
  isDeleting: boolean;
  onEpicSelection: (id: number) => void;
  onDeleteEpic: EpicCardProps["onDeleteEpic"];
  onLinkStory: EpicCardProps["onLinkStory"];
  onCreateStory: EpicCardProps["onCreateStory"];
}

function EpicRow({
  epic,
  tickets,
  unlinkedStories,
  projectId,
  projectKey,
  projectStatuses,
  canUpdate,
  selected,
  isDeleting,
  onEpicSelection,
  onDeleteEpic,
  onLinkStory,
  onCreateStory,
}: EpicRowProps) {
  function handleSelectionChange() {
    onEpicSelection(epic.id);
  }

  return (
    <div className="flex items-start gap-2">
      {canUpdate && (
        <input
          type="checkbox"
          aria-label={`Select epic ${epic.title}`}
          checked={selected}
          onChange={handleSelectionChange}
          className="mt-4 h-4 w-4 shrink-0 cursor-pointer"
        />
      )}
      <div className="flex-1 min-w-0">
        <EpicCard
          epic={epic}
          dependencyCount={epic.dependencyCount}
          stories={tickets.filter(
            (t) => t.type !== "EPIC" && t.epicId === epic.id,
          )}
          projectId={projectId}
          projectKey={projectKey}
          projectStatuses={projectStatuses}
          unlinkedStories={unlinkedStories}
          onDeleteEpic={onDeleteEpic}
          onLinkStory={onLinkStory}
          onCreateStory={onCreateStory}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}
