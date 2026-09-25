"use client";

import { BarChart2, CheckCircle2, FolderOpen, Inbox, LayoutGrid, MessageSquare, ThumbsUp } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";
import { useManagedProductInsights } from "@/hooks/api/build/managed-products";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";

interface ProductInsightsPageProps {
  managedProductId: number;
}

export function ProductInsightsPage({ managedProductId }: ProductInsightsPageProps) {
  const { data, isLoading, isError, error, refetch } = useManagedProductInsights(managedProductId);

  const resolution = usePageState({
    permission: "build:managed-products:view",
    isLoading,
    isError,
    error,
  });

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper
      title="Insights"
      subtitle="Aggregated activity for this product"
    >
      <PmPageShell>
        <PmSection index={0} className="shrink-0">
          <PageState
            resolution={resolution}
            loading={
              <div className="space-y-6">
                <div>
                  <h2 className="mb-3 text-sm font-semibold text-foreground">Projects</h2>
                  <StatCardGridSkeleton cols={3} />
                </div>
                <div>
                  <h2 className="mb-3 text-sm font-semibold text-foreground">Feedback submissions</h2>
                  <StatCardGridSkeleton cols={4} />
                </div>
              </div>
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <div className="space-y-6">
              <div>
                <h2 className="mb-3 text-sm font-semibold text-foreground">Projects</h2>
                <StatCardGrid cols={3}>
                  <StatCard
                    label="Linked projects"
                    value={data?.linkedProjectCount ?? 0}
                    icon={LayoutGrid}
                    tone="default"
                  />
                  <StatCard
                    label="Active"
                    value={data?.projectsByStatus.active ?? 0}
                    icon={FolderOpen}
                    tone="emerald"
                  />
                  <StatCard
                    label="Completed"
                    value={data?.projectsByStatus.completed ?? 0}
                    icon={CheckCircle2}
                    tone="blue"
                  />
                </StatCardGrid>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold text-foreground">Feedback submissions</h2>
                <StatCardGrid cols={4}>
                  <StatCard
                    label="Open"
                    value={data?.submissionsByStatus.open ?? 0}
                    icon={Inbox}
                    tone="default"
                  />
                  <StatCard
                    label="In progress"
                    value={data?.submissionsByStatus.in_progress ?? 0}
                    icon={BarChart2}
                    tone="amber"
                  />
                  <StatCard
                    label="Resolved"
                    value={data?.submissionsByStatus.resolved ?? 0}
                    icon={CheckCircle2}
                    tone="emerald"
                  />
                  <StatCard
                    label="Archived"
                    value={data?.submissionsByStatus.archived ?? 0}
                    icon={FolderOpen}
                    tone="default"
                  />
                </StatCardGrid>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold text-foreground">Roadmap outcomes</h2>
                <StatCardGrid cols={4}>
                  <StatCard
                    label="Roadmap items"
                    value={data?.roadmapItemCount ?? 0}
                    icon={LayoutGrid}
                    tone="default"
                  />
                  <StatCard
                    label="Completed items"
                    value={data?.roadmapItemsByStatus.completed ?? 0}
                    icon={CheckCircle2}
                    tone="blue"
                  />
                  <StatCard
                    label="Linked feedback"
                    value={Object.values(data?.feedbackByStatus ?? {}).reduce((total, value) => total + value, 0)}
                    icon={MessageSquare}
                    tone="amber"
                  />
                  <StatCard
                    label="Feedback votes"
                    value={data?.linkedFeedbackVoteCount ?? 0}
                    icon={ThumbsUp}
                    tone="emerald"
                  />
                </StatCardGrid>
              </div>
            </div>
          </PageState>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
