"use client";

import { BarChart2, CheckCircle2, FolderOpen, Inbox, LayoutGrid } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";
import { useManagedProductInsights } from "@/hooks/api/build/managed-products";
import { usePermissionGate } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { resolveGate } from "@/lib/rbac/gate";

interface ProductInsightsPageProps {
  managedProductId: number;
}

export function ProductInsightsPage({ managedProductId }: ProductInsightsPageProps) {
  const viewGate = usePermissionGate("build:managed-products:view");
  const { data, isLoading, isError, error, refetch } = useManagedProductInsights(managedProductId);

  const gate = resolveGate({
    access: viewGate.pending ? "loading" : viewGate.denied ? "denied" : "granted",
    isLoading,
    isError,
    isEmpty: false,
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
          {gate === "denied" ? (
            <NoPermissionState
              permission="build:managed-products:view"
              className={PM_FILL_PANEL}
            />
          ) : gate === "error" ? (
            <ErrorState
              className={PM_FILL_PANEL}
              title="Couldn't load insights"
              description={getErrorMessage(error)}
              onRetry={handleRetry}
            />
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="mb-3 text-sm font-semibold text-foreground">Projects</h2>
                <StatCardGrid cols={3}>
                  <StatCard
                    label="Linked projects"
                    value={data?.linkedProjectCount ?? 0}
                    icon={LayoutGrid}
                    tone="default"
                    isLoading={gate === "loading"}
                  />
                  <StatCard
                    label="Active"
                    value={data?.projectsByStatus.active ?? 0}
                    icon={FolderOpen}
                    tone="emerald"
                    isLoading={gate === "loading"}
                  />
                  <StatCard
                    label="Completed"
                    value={data?.projectsByStatus.completed ?? 0}
                    icon={CheckCircle2}
                    tone="blue"
                    isLoading={gate === "loading"}
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
                    isLoading={gate === "loading"}
                  />
                  <StatCard
                    label="In progress"
                    value={data?.submissionsByStatus.in_progress ?? 0}
                    icon={BarChart2}
                    tone="amber"
                    isLoading={gate === "loading"}
                  />
                  <StatCard
                    label="Resolved"
                    value={data?.submissionsByStatus.resolved ?? 0}
                    icon={CheckCircle2}
                    tone="emerald"
                    isLoading={gate === "loading"}
                  />
                  <StatCard
                    label="Archived"
                    value={data?.submissionsByStatus.archived ?? 0}
                    icon={FolderOpen}
                    tone="default"
                    isLoading={gate === "loading"}
                  />
                </StatCardGrid>
              </div>
            </div>
          )}
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
