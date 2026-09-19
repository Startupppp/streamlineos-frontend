"use client";

import Link from "next/link";
import { useManagedProduct } from "@/hooks/api/build/managed-products";
import { useProjects } from "@/hooks/api/build/projects";
import { useGoalsPage } from "@/hooks/api/goals";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Target } from "lucide-react";

interface ManagedProductOverviewPageProps {
  managedProductId: number;
}

function ManagedProductOverviewSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-6">
      <StatCardGridSkeleton cols={2} count={2} />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

export function ManagedProductOverviewPage({ managedProductId }: ManagedProductOverviewPageProps) {
  const productQuery = useManagedProduct(managedProductId);
  const projectsQuery = useProjects(
    { managedProductId, limit: 10 },
    { enabled: !!managedProductId },
  );
  const goalsPageQuery = useGoalsPage({ managedProductId });

  const isLoading =
    productQuery.isLoading || projectsQuery.isLoading || goalsPageQuery.isLoading;

  const isError =
    productQuery.isError || projectsQuery.isError || goalsPageQuery.isError;

  const resolution = usePageState({
    permission: "build:managed-products:view",
    isLoading,
    isError,
    isEmpty: !productQuery.data,
  });

  const product = productQuery.data;
  const projectsPage = projectsQuery.data;
  const goalsPage = goalsPageQuery.data;

  const firstPageProjectCount = projectsPage?.data?.length ?? 0;
  const hasMoreProjects = projectsPage?.hasMore ?? false;
  const linkedProjectsLabel = hasMoreProjects
    ? `${firstPageProjectCount}+`
    : String(firstPageProjectCount);

  const goalsTotal = goalsPage?.total ?? null;

  function handleRetry() {
    void productQuery.refetch();
    void projectsQuery.refetch();
    void goalsPageQuery.refetch();
  }

  const linkedProjects = projectsPage?.data ?? [];

  return (
    <PageWrapper
      title={product?.name ?? "Product overview"}
      badge={product?.key}
      subtitle={product?.description ?? undefined}
    >
      <PageState
        resolution={resolution}
        loading={<ManagedProductOverviewSkeleton />}
        onRetry={handleRetry}
        className="flex-1 min-h-0"
      >
        <div className="flex flex-1 min-h-0 flex-col gap-6">
          <StatCardGrid cols={2}>
            <StatCard
              label="Linked projects"
              value={linkedProjectsLabel}
              icon={Briefcase}
              tone="blue"
              isLoading={projectsQuery.isLoading}
              hint={hasMoreProjects ? "First page shown" : undefined}
              href={`/build/managed-products/${managedProductId}/projects`}
            />
            {goalsTotal !== null ? (
              <StatCard
                label="Goals"
                value={goalsTotal}
                icon={Target}
                tone="violet"
                isLoading={goalsPageQuery.isLoading}
              />
            ) : null}
          </StatCardGrid>

          {linkedProjects.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-sm font-semibold">Linked projects</h2>
              </CardHeader>
              <CardContent className="space-y-2">
                {linkedProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <Link
                      href={`/build/${proj.id}`}
                      className="truncate text-blue-600 hover:underline"
                    >
                      {proj.name}
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">{proj.key}</span>
                      {proj.status && (
                        <Badge variant="outline" className="h-5 px-2 py-0.5 text-[10px]">
                          {proj.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {hasMoreProjects && (
                  <Link
                    href={`/build/managed-products/${managedProductId}/projects`}
                    className="block text-[11px] text-blue-600 hover:underline"
                  >
                    View all linked projects
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {product?.vision && (
            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-sm font-semibold">Vision</h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{product.vision}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </PageState>
    </PageWrapper>
  );
}
