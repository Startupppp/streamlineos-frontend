"use client";

import { Component, type ReactNode } from "react";
import Link from "next/link";
import {
  BarChart2,
  CheckCircle2,
  Clock,
  FolderOpen,
  Inbox,
  LayoutGrid,
  MessageSquare,
  ThumbsUp,
  PlugZap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModuleEnabled } from "@/hooks/api/access";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/shared/error-state";
import type { ManagedProductInsights } from "@/hooks/api/build/managed-products-schema";
import { CustomerImpactPanel } from "./customer-impact-panel";
import { OpportunityImpactTable } from "./opportunity-impact-table";
import { getUserDisplayName } from "@/lib/person-display";
import { ProductDiscoverySection } from "./insights/product-discovery-section";

interface ProductDiscoverySectionBoundaryState {
  hasError: boolean;
}

class ProductDiscoverySectionBoundary extends Component<
  { children: ReactNode },
  ProductDiscoverySectionBoundaryState
> {
  state: ProductDiscoverySectionBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ProductDiscoverySectionBoundaryState {
    return { hasError: true };
  }

  handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <ErrorState
        compact
        title="Discovery is unavailable"
        description="This section could not load. Try again or reload the page."
        onRetry={this.handleRetry}
      />
    );
  }
}

interface InsightPanelProps {
  managedProductId: number;
  insights: ManagedProductInsights | null | undefined;
}

export function InsightOverviewPanel({
  insights,
  rangeLabel,
}: InsightPanelProps & { rangeLabel: string }) {
  const openSubmissions = insights?.submissionsByStatus.open ?? 0;
  const activeRoadmap =
    (insights?.roadmapItemsByStatus.planned ?? 0) +
    (insights?.roadmapItemsByStatus.in_progress ?? 0);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-balance text-base font-semibold text-foreground">
          Where to focus
        </h2>
        <p className="mt-1 max-w-[65ch] text-sm text-muted-foreground text-pretty">
          Activity created in {rangeLabel.toLowerCase()}; status reflects where
          that work stands now.
        </p>
        <StatCardGrid cols={3} className="mt-4" stackOnMobile>
          <StatCard
            label="Needs triage"
            value={openSubmissions}
            icon={Inbox}
            tone="amber"
            subtitle="Open customer submissions below"
          />
          <StatCard
            label="Planned or underway"
            value={activeRoadmap}
            icon={Clock}
            tone="blue"
            subtitle="Roadmap items"
          />
          <StatCard
            label="Delivered"
            value={insights?.roadmapItemsByStatus.completed ?? 0}
            icon={CheckCircle2}
            tone="emerald"
            subtitle="Completed roadmap items"
          />
        </StatCardGrid>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">
          Product context
        </h2>
        <StatCardGrid cols={2}>
          <StatCard
            label="Days since product update"
            value={insights?.ageDays ?? 0}
            icon={Clock}
            tone="default"
          />
          {insights?.confidenceScore != null && (
            <StatCard
              label="Confidence score"
              value={insights.confidenceScore}
              icon={CheckCircle2}
              tone="blue"
            />
          )}
        </StatCardGrid>
        {insights?.overrideReason != null && (
          <div
            className="mt-3 rounded-md border border-border p-3 text-sm text-muted-foreground"
            data-testid="score-override-reason"
          >
            <span className="font-medium text-foreground">Override: </span>
            {insights.overrideReason}
            {insights.overriddenBy != null && (
              <span className="ml-1">
                — {getUserDisplayName(insights.overriddenBy)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function InsightDeliveryPanel({
  insights,
}: InsightPanelProps) {
  const linkedFeedback = Object.values(insights?.feedbackByStatus ?? {}).reduce(
    (total, value) => total + value,
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">
          Delivery coverage
        </h2>
        <StatCardGrid cols={3}>
          <StatCard
            label="Linked projects"
            value={insights?.linkedProjectCount ?? 0}
            icon={LayoutGrid}
            tone="default"
          />
          <StatCard
            label="Active"
            value={insights?.projectsByStatus.active ?? 0}
            icon={FolderOpen}
            tone="emerald"
          />
          <StatCard
            label="Completed"
            value={insights?.projectsByStatus.completed ?? 0}
            icon={CheckCircle2}
            tone="blue"
          />
        </StatCardGrid>
      </div>

      <div>
        <h2 className="mb-1 text-sm font-medium text-foreground">
          Evidence linked to the roadmap
        </h2>
        <p className="mb-3 max-w-[65ch] text-sm text-muted-foreground text-pretty">
          Linked feedback posts are distinct from widget submissions.
        </p>
        <StatCardGrid cols={4}>
          <StatCard
            label="Roadmap items"
            value={insights?.roadmapItemCount ?? 0}
            icon={LayoutGrid}
            tone="default"
          />
          <StatCard
            label="Completed items"
            value={insights?.roadmapItemsByStatus.completed ?? 0}
            icon={CheckCircle2}
            tone="blue"
          />
          <StatCard
            label="Linked feedback"
            value={linkedFeedback}
            icon={MessageSquare}
            tone="amber"
          />
          <StatCard
            label="Feedback votes"
            value={insights?.linkedFeedbackVoteCount ?? 0}
            icon={ThumbsUp}
            tone="emerald"
          />
        </StatCardGrid>
      </div>
    </div>
  );
}

export function InsightFeedbackPanel({
  managedProductId,
  insights,
}: InsightPanelProps) {
  const feedbucketEnabled = useModuleEnabled("build");
  if (!feedbucketEnabled) {
    return (
      <section aria-label="Customer response" className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><PlugZap className="size-5" aria-hidden /></div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">Connect customer feedback</h2>
            <p className="mt-1 max-w-[65ch] text-sm text-muted-foreground">Enable Feedbucket for this organization to collect widget submissions and see customer response here.</p>
            <Button asChild variant="outline" size="sm" className="mt-4"><Link href="/settings/modules">Open module settings</Link></Button>
          </div>
        </div>
      </section>
    );
  }
  return (
    <div>
      <h2 className="mb-1 text-sm font-medium text-foreground">
        Customer response
      </h2>
      <p className="mb-3 max-w-[65ch] text-sm text-muted-foreground text-pretty">
        Widget submissions for this product, grouped by status.
      </p>
      <StatCardGrid cols={4}>
        <StatCard
          label="Open"
          value={insights?.submissionsByStatus.open ?? 0}
          icon={Inbox}
          tone="default"
        />
        <StatCard
          label="In progress"
          value={insights?.submissionsByStatus.in_progress ?? 0}
          icon={BarChart2}
          tone="amber"
        />
        <StatCard
          label="Resolved"
          value={insights?.submissionsByStatus.resolved ?? 0}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Archived"
          value={insights?.submissionsByStatus.archived ?? 0}
          icon={FolderOpen}
          tone="default"
        />
      </StatCardGrid>
      <div className="mt-4 flex flex-col gap-4">
        <CustomerImpactPanel managedProductId={managedProductId} />
        <OpportunityImpactTable managedProductId={managedProductId} />
      </div>
    </div>
  );
}

export function InsightDiscoveryPanel({
  managedProductId,
}: {
  managedProductId: number;
}) {
  return (
    <ProductDiscoverySectionBoundary>
      <ProductDiscoverySection managedProductId={managedProductId} />
    </ProductDiscoverySectionBoundary>
  );
}
