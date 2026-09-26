"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCanState } from "@/hooks/api/access";
import { useOrgReleases } from "@/hooks/api/build/releases";
import { PmSection, PmPanel } from "@/components/pm-chrome";
import { PanelHeader } from "./panel-header";
import {
  COMMAND_CENTER_LIST_PANEL,
  COMMAND_CENTER_PANEL_BODY_SCROLL,
} from "./command-center-constants";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  released: "Released",
  archived: "Archived",
};

function ReleaseRow({
  name,
  version,
  status,
}: {
  name: string;
  version: string;
  status: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 border-b border-border/40 px-3 py-2 last:border-0">
      <div className="min-w-0 flex-1 truncate">
        <span className="truncate text-xs font-medium text-foreground">{name}</span>
        <span className="ml-1.5 text-micro text-muted-foreground">{version}</span>
      </div>
      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-micro font-medium text-muted-foreground">
        {STATUS_LABEL[status] ?? status}
      </span>
    </div>
  );
}

export function ReleasesPanel() {
  const canState = useCanState("build:view");
  const { data, isLoading, isError, error } = useOrgReleases();

  if (canState === "denied") return null;

  const items = data?.data ?? [];
  const hasMore = data?.pagination.hasMore ?? false;
  const isLoadingState = canState === "loading" || isLoading;

  return (
    <PmSection
      index={6}
      className="flex min-h-0 min-w-0 w-full max-w-full flex-col lg:col-span-2"
    >
      <PmPanel className={COMMAND_CENTER_LIST_PANEL}>
        <PanelHeader
          title="Releases"
          actions={
            (items.length > 0 || hasMore) ? (
              <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-micro" asChild>
                <Link href="/build/releases">
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            ) : undefined
          }
        />
        <div className={COMMAND_CENTER_PANEL_BODY_SCROLL}>
          {isLoadingState ? (
            <div className="flex flex-col gap-1 p-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex h-full items-center justify-center p-4">
              <ErrorState
                description={getErrorMessage(error)}
                compact
              />
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full items-center justify-center p-4">
              <EmptyState
                title="No releases"
                description="No releases have been created yet"
                compact
              />
            </div>
          ) : (
            <div className="overflow-y-auto">
              {items.slice(0, 8).map((release) => (
                <ReleaseRow
                  key={release.id}
                  name={release.name}
                  version={release.version}
                  status={release.status}
                />
              ))}
            </div>
          )}
        </div>
      </PmPanel>
    </PmSection>
  );
}
