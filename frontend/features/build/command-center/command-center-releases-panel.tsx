"use client";

import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { RELEASE_STATUS_PRESENTATION } from "@/lib/build/release-status";
import { useCanState } from "@/hooks/api/access";
import { useOrgReleases } from "@/hooks/api/build/releases";
import type { Release } from "@/types/projects";
import { PmSection, PmPanel } from "@/components/pm-chrome";
import { PanelHeader } from "./panel-header";
import {
  COMMAND_CENTER_LIST_PANEL,
  COMMAND_CENTER_PANEL_SECTION,
  COMMAND_CENTER_PANEL_BODY_SCROLL,
} from "./command-center-constants";

function ReleaseRow({
  name,
  version,
  status,
  projectId,
}: {
  name: string;
  version: string;
  status: Release["status"];
  projectId: number;
}) {
  const presentation = RELEASE_STATUS_PRESENTATION[status];
  return (
    <Link
      href={`/build/${projectId}/releases`}
      className="group flex min-w-0 items-center gap-2.5 rounded-lg border border-border/80 bg-card px-3 py-2.5 shadow-xs transition-colors hover:border-foreground/20 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
        <Rocket className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-foreground">{name}</span>
        <span className="mt-0.5 block truncate text-micro text-muted-foreground">Version {version}</span>
      </span>
      <Badge variant="outline" className={presentation.className}>
        {presentation.label}
      </Badge>
      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
    </Link>
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
      className={COMMAND_CENTER_PANEL_SECTION}
    >
      <PmPanel className={COMMAND_CENTER_LIST_PANEL}>
        <PanelHeader
          title="Releases"
          actions={
            (items.length > 0 || hasMore) ? (
              <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-micro" asChild>
                <Link href="/build/projects">
                  Projects
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
            <div className="flex flex-col gap-2 overflow-y-auto p-3">
              {items.slice(0, 8).map((release) => (
                <ReleaseRow
                  key={release.id}
                  name={release.name}
                  version={release.version}
                  status={release.status}
                  projectId={release.projectId}
                />
              ))}
            </div>
          )}
        </div>
      </PmPanel>
    </PmSection>
  );
}
