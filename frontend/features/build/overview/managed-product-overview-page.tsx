"use client";

import Link from "next/link";
import { useManagedProduct } from "@/hooks/api/build/managed-products";
import { useProjects } from "@/hooks/api/build/projects";
import { useRoadmapItems } from "@/hooks/api/build/roadmap";
import { useGoalsPage } from "@/hooks/api/goals";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Map, Target } from "lucide-react";

interface ManagedProductOverviewPageProps {
  managedProductId: number;
}

function ManagedProductOverviewSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-6">
      <StatCardGridSkeleton cols={2} count={1} />
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
  const roadmapQuery = useRoadmapItems({ managedProductId, limit: 5 });
  const goalsQuery = useGoalsPage({ managedProductId });

  const isLoading = productQuery.isLoading || projectsQuery.isLoading;

  const isError = productQuery.isError || projectsQuery.isError;

  const error = productQuery.error ?? projectsQuery.error;

  const resolution = usePageState({
    permission: "build:managed-products:view",
    isLoading,
    isError,
    error,
    isEmpty: !productQuery.data,
  });

  const product = productQuery.data;
  const projectsPage = projectsQuery.data;

  const firstPageProjectCount = projectsPage?.data?.length ?? 0;
  const hasMoreProjects = projectsPage?.hasMore ?? false;
  const linkedProjectsLabel = hasMoreProjects
    ? `${firstPageProjectCount}+`
    : String(firstPageProjectCount);

  function handleRetry() {
    void productQuery.refetch();
    void projectsQuery.refetch();
    void roadmapQuery.refetch();
    void goalsQuery.refetch();
  }

  const linkedProjects = projectsPage?.data ?? [];
  const roadmapItems = roadmapQuery.data?.data ?? [];
  const hasMoreRoadmap = roadmapQuery.data?.pagination?.hasMore ?? false;
  const goalsLabel = String(goalsQuery.data?.total ?? 0);

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
            <StatCard
              label="Goals"
              value={goalsLabel}
              icon={Target}
              tone="emerald"
              isLoading={goalsQuery.isLoading}
              href={`/build/managed-products/${managedProductId}/goals`}
            />
          </StatCardGrid>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-sm font-semibold">Roadmap</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {roadmapItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No roadmap items for this product yet.
                </p>
              ) : (
                roadmapItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">{item.title}</span>
                    <Badge variant="outline" className="h-5 shrink-0 px-2 py-0.5 text-micro">
                      {item.status}
                    </Badge>
                  </div>
                ))
              )}
              {hasMoreRoadmap && (
                <Link
                  href={`/build/managed-products/${managedProductId}/roadmap`}
                  className="block text-dense text-primary hover:underline"
                >
                  View full roadmap
                </Link>
              )}
            </CardContent>
          </Card>

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
                      className="truncate text-primary hover:underline"
                    >
                      {proj.name}
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-dense text-muted-foreground">{proj.key}</span>
                      {proj.status && (
                        <Badge variant="outline" className="h-5 px-2 py-0.5 text-micro">
                          {proj.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {hasMoreProjects && (
                  <Link
                    href={`/build/managed-products/${managedProductId}/projects`}
                    className="block text-dense text-primary hover:underline"
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
