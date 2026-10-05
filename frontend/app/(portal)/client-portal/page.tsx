"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { ErrorState } from "@/components/shared/error-state";
import { PortalHeader } from "@/features/portal/components/portal-header";
import { PortalProjectCard } from "@/features/portal/components/portal-project-card";
import { usePortalGuard } from "@/hooks/api/portal/use-portal-guard";
import { useExternalPortalProjects } from "@/hooks/api/portal/use-portal-projects";

function ProjectsListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-1 pt-1">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-14 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PortalProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isReady } = usePortalGuard();

  const waitingParam = searchParams.get("waiting");
  const waiting = waitingParam === "true" ? true : undefined;

  const filters = waiting ? { waiting } : undefined;

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useExternalPortalProjects(filters);

  const handleLoadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleWaitingChange = useCallback(
    (value: boolean | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === true) {
        params.set("waiting", "true");
      } else {
        params.delete("waiting");
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const projects = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <PortalHeader showProjectsLink />
      <main className="flex-1 px-4 sm:px-6 py-8 max-w-5xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Your projects</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Projects shared with you by your team.
          </p>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            aria-pressed={waiting === true}
            onClick={() => handleWaitingChange(waiting === true ? undefined : true)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              waiting === true
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30"
            }`}
          >
            Awaiting my approval
          </button>
        </div>

        {!isReady || isLoading ? (
          <ProjectsListSkeleton />
        ) : isError ? (
          <ErrorState
            title="Could not load projects"
            description="There was a problem fetching your projects. Please try again."
            onRetry={handleRetry}
            className="min-h-[320px]"
          />
        ) : projects.length === 0 ? (
          <EmptyState
            illustrationPreset="projects"
            title={waiting === true ? "No projects awaiting approval" : "No projects yet"}
            description={
              waiting === true
                ? "No projects have approvals waiting for you right now."
                : "Projects your team shares with you will appear here. Contact your project team if you were expecting access."
            }
            className="min-h-[320px]"
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <PortalProjectCard key={project.id} project={project} />
              ))}
            </div>
            <InfiniteScrollSentinel
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={handleLoadMore}
              label="Load more projects"
              pending={<ProjectsListSkeleton />}
              className="mt-4"
            />
          </>
        )}
      </main>
    </div>
  );
}
