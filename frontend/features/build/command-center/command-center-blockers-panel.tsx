"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { PmSection, PmPanel } from "@/components/pm-chrome";
import { PanelHeader } from "./panel-header";
import {
  COMMAND_CENTER_LIST_PANEL,
  COMMAND_CENTER_PANEL_SECTION,
  COMMAND_CENTER_PANEL_BODY_SCROLL,
} from "./command-center-constants";
import { useInfiniteAllWork } from "@/hooks/api/build/all-work";
import { mapAllWorkTicketToMyWorkItem } from "./command-center-utils";
import { MyWorkRow } from "./command-center-my-work-row";

const OVERDUE_BLOCKERS_FILTERS = {
  scope: "blocked" as const,
  excludeStatus: "DONE,CANCELLED",
  limit: 10,
} as const;

export function BlockersPanel() {
  const { data, isLoading, isError, error } = useInfiniteAllWork(
    OVERDUE_BLOCKERS_FILTERS,
    { throwOnError: false },
  );

  const items = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <PmSection
      index={6}
      className={COMMAND_CENTER_PANEL_SECTION}
    >
      <PmPanel className={COMMAND_CENTER_LIST_PANEL}>
        <PanelHeader
          title="Blockers"
        />
        <div className={COMMAND_CENTER_PANEL_BODY_SCROLL}>
          {isLoading ? (
            <div className="flex flex-col gap-1 p-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex h-full items-center justify-center p-4">
              <ErrorState description={getErrorMessage(error)} compact />
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full items-center justify-center p-4">
              <EmptyState title="No blockers" description="No overdue blocked tickets" compact />
            </div>
          ) : (
            <div className="overflow-y-auto">
              {items.map((item) => (
                <MyWorkRow key={item.id} item={mapAllWorkTicketToMyWorkItem(item)} />
              ))}
            </div>
          )}
        </div>
      </PmPanel>
    </PmSection>
  );
}
