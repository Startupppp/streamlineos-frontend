"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmPanel, PmSection } from "@/components/pm-chrome";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useProgram } from "@/hooks/api/build/programs";
import { useCan } from "@/hooks/api/access";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { TablePagination } from "@/components/ui/table-pagination";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import { PortfolioStatusBadge, PortfolioHealthBadge } from "../portfolios/portfolio-status-badge";

interface Props {
  programId: number;
}

function DetailSkeleton() {
  return (
    <PmPageShell>
      <PmPanel className="space-y-3 p-4">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </PmPanel>
    </PmPageShell>
  );
}

export function ProgramDetailPage({ programId }: Props) {
  const canViewPortfolio = useCan("build:portfolios:view");
  const pager = useBuildCursorPager(String(programId));
  const { data, isLoading, isError, error, refetch, isFetching } = useProgram(programId, {
    projectsCursor: pager.cursor,
    projectsLimit: 20,
  });
  const resolution = usePageState({
    permission: "build:programs:view", isLoading, isError, error, isEmpty: data === undefined,
  });
  const projects = data?.projects.data ?? [];
  return (
    <PageWrapper title={resolution.kind === "ready" ? data?.name ?? "Program" : "Program"} backHref="/build/programs">
      <PageState resolution={resolution} loading={<DetailSkeleton />} onRetry={() => { void refetch(); }}
        empty={<EmptyState title="Program unavailable" description="This program could not be loaded." />}>
        {data && (
          <PmPageShell>
            <PmSection index={0}>
              <PmPanel className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <PortfolioStatusBadge status={data.status} />
                  <PortfolioHealthBadge health={data.health} />
                </div>
                {data.description && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{data.description}</p>}
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-muted-foreground">Owner</dt><dd>{data.ownerId ? "Assigned — details unavailable" : "Unassigned"}</dd></div>
                  <div><dt className="text-muted-foreground">Portfolio</dt><dd>
                    {data.portfolioId === null ? "No portfolio" : canViewPortfolio ? (
                      <Link href={`/build/portfolios/${data.portfolioId}`} className="underline underline-offset-4">View portfolio</Link>
                    ) : "Linked — details unavailable"}
                  </dd></div>
                </dl>
              </PmPanel>
            </PmSection>
            <PmSection index={1}>
              <PmPanel className="space-y-3 p-4">
                <h2 className="text-sm font-medium">Linked projects</h2>
                {projects.length === 0 ? (
                  <EmptyState title="No projects available" description="No projects are available on this page." />
                ) : (
                  <ul className="space-y-2">
                    {projects.map(project => (
                      <li key={project.id}>
                        <Link href={`/build/${project.id}`} className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border p-3 text-sm hover:bg-muted/50">
                          <span className="font-mono text-muted-foreground">{project.key}</span>
                          <span className="min-w-0 flex-1 break-words">{project.name}</span>
                          <span className="text-muted-foreground">{project.status}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <TablePagination mode="cursor" rowCount={projects.length} pageNumber={pager.pageNumber}
                  hasMore={data.projects.pagination.hasMore} hasPrevious={pager.hasPrevious}
                  onNext={() => pager.goNext(data.projects.pagination.nextCursor)} onPrevious={pager.goPrevious}
                  disabled={isFetching} />
              </PmPanel>
            </PmSection>
          </PmPageShell>
        )}
      </PageState>
    </PageWrapper>
  );
}
