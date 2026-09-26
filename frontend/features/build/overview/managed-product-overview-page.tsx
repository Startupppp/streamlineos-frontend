"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useManagedProduct,
  useManagedProductInsights,
} from "@/hooks/api/build/managed-products";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Briefcase, Map, MessageSquare, Target } from "lucide-react";
import { BUILD_FILTER_ALL, useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { cn } from "@/lib/utils";

const OVERVIEW_FILTER_DEFINITIONS = [
  { param: "q" },
] as const;

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
  const router = useRouter();
  const listFilters = useBuildListFilters({ filters: OVERVIEW_FILTER_DEFINITIONS, withSearch: false });
  const rawQ = listFilters.value("q");
  const searchValue = rawQ === BUILD_FILTER_ALL ? undefined : rawQ;

  const productQuery = useManagedProduct(managedProductId);
  const projectsQuery = useProjects(
    { managedProductId, limit: 10, search: searchValue },
    { enabled: !!managedProductId },
  );
  const insightsQuery = useManagedProductInsights(managedProductId);
  const roadmapQuery = useRoadmapItems({ managedProductId, limit: 5 });
  const goalsQuery = useGoalsPage({ managedProductId });

  const isLoading =
    productQuery.isLoading || projectsQuery.isLoading || insightsQuery.isLoading;

  const isError =
    productQuery.isError || projectsQuery.isError || insightsQuery.isError;

  const error = productQuery.error ?? projectsQuery.error ?? insightsQuery.error;

  const resolution = usePageState({
    permission: "build:managed-products:view",
    isLoading,
    isError,
    error,
    isEmpty: !productQuery.data,
  });

  const product = productQuery.data;
  const projectsPage = projectsQuery.data;

  const hasMoreProjects = projectsPage?.hasMore ?? false;
  const linkedProjectsLabel = String(insightsQuery.data?.linkedProjectCount ?? 0);

  function handleRetry() {
    void productQuery.refetch();
    void projectsQuery.refetch();
    void insightsQuery.refetch();
    void roadmapQuery.refetch();
    void goalsQuery.refetch();
  }

  const linkedProjects = projectsPage?.data ?? [];
  const roadmapItems = roadmapQuery.data?.data ?? [];
  const hasMoreRoadmap = roadmapQuery.data?.pagination?.hasMore ?? false;
  const goalsLabel = String(goalsQuery.data?.total ?? 0);

  const feedbackTotal = Object.values(
    insightsQuery.data?.feedbackByStatus ?? {},
  ).reduce((a: number, b: number) => a + b, 0);

  const handleOpenFocused = useCallback(
    (index: number) => {
      const proj = linkedProjects[index];
      if (proj) {
        router.push(`/build/${proj.id}`);
      }
    },
    [linkedProjects, router],
  );

  const handleClearSelection = useCallback(() => {}, []);

  const { focusedIndex } = useBuildListKeyboard({
    itemCount: linkedProjects.length,
    onOpen: handleOpenFocused,
    onClearSelection: handleClearSelection,
    enabled: linkedProjects.length > 0,
  });

  return (
    <PageWrapper
      title={product?.name ?? "Product overview"}
      badge={product?.key}
      subtitle={
        product?.status && product?.updatedAt
          ? `${product.status} · updated ${product.updatedAt.slice(0, 10)}`
          : product?.status ?? undefined
      }
    >
      <PageState
        resolution={resolution}
        loading={<ManagedProductOverviewSkeleton />}
        empty={<EmptyState title="Product not found" description="This product may have been deleted or moved." className="flex-1" />}
        onRetry={handleRetry}
        className="flex-1 min-h-0"
      >
        <div className="flex flex-1 min-h-0 flex-col gap-6">
          <StatCardGrid cols={3}>
            <StatCard
              label="Linked projects"
              value={linkedProjectsLabel}
              icon={Briefcase}
              tone="blue"
              isLoading={insightsQuery.isLoading}
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
            <StatCard
              label="Feedback"
              value={String(feedbackTotal)}
              icon={MessageSquare}
              tone="amber"
              isLoading={insightsQuery.isLoading}
              href={`/build/managed-products/${managedProductId}/feedback`}
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
                {linkedProjects.map((proj, index) => (
                  <div
                    key={proj.id}
                    aria-selected={focusedIndex === index}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-md px-1 text-sm transition-colors",
                      focusedIndex === index && "bg-accent",
                    )}
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
