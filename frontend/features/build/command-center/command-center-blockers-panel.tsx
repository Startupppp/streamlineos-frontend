"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const MY_BLOCKED_FILTERS = {
  scope: "mine" as const,
  blockedOnly: true,
  excludeStatus: "DONE,CANCELLED",
  limit: 10,
} as const;

const MY_BLOCKED_HREF = "/build/my-work?tab=blocked";

export function BlockersPanel() {
  const { data, isLoading, isError, error } = useInfiniteAllWork(
    MY_BLOCKED_FILTERS,
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
          actions={
            items.length > 0 ? (
              <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-micro" asChild>
                <Link href={MY_BLOCKED_HREF}>
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            ) : undefined
          }
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
              <EmptyState
                title="No blockers"
                description="None of your open issues are blocked by other work"
                compact
              />
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
