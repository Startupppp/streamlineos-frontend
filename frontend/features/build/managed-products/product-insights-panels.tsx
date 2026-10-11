"use client";

import {
  BarChart2,
  CheckCircle2,
  Clock,
  FolderOpen,
  Inbox,
  LayoutGrid,
  MessageSquare,
  ThumbsUp,
} from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import type { ManagedProductInsights } from "@/hooks/api/build/managed-products-schema";
import { getUserDisplayName } from "@/lib/person-display";
import { ProductDiscoverySection } from "./insights/product-discovery-section";

interface InsightPanelProps {
  managedProductId: number;
  insights: ManagedProductInsights | null | undefined;
}

function productHref(managedProductId: number, path: string) {
  return `/build/managed-products/${managedProductId}/${path}`;
}

export function InsightOverviewPanel({
  managedProductId,
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
            href={productHref(managedProductId, "feedback?status=open")}
          />
          <StatCard
            label="Planned or underway"
            value={activeRoadmap}
            icon={Clock}
            tone="blue"
            subtitle="Roadmap items"
            href={productHref(managedProductId, "roadmap")}
          />
          <StatCard
            label="Delivered"
            value={insights?.roadmapItemsByStatus.completed ?? 0}
            icon={CheckCircle2}
            tone="emerald"
            subtitle="Completed roadmap items"
            href={productHref(managedProductId, "roadmap?status=completed")}
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
  managedProductId,
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
            href={productHref(managedProductId, "projects")}
          />
          <StatCard
            label="Active"
            value={insights?.projectsByStatus.active ?? 0}
            icon={FolderOpen}
            tone="emerald"
            href={productHref(managedProductId, "projects?filterStatus=ACTIVE")}
          />
          <StatCard
            label="Completed"
            value={insights?.projectsByStatus.completed ?? 0}
            icon={CheckCircle2}
            tone="blue"
            href={productHref(
              managedProductId,
              "projects?filterStatus=COMPLETED",
            )}
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
            href={productHref(managedProductId, "roadmap")}
          />
          <StatCard
            label="Completed items"
            value={insights?.roadmapItemsByStatus.completed ?? 0}
            icon={CheckCircle2}
            tone="blue"
            href={productHref(managedProductId, "roadmap?status=completed")}
          />
          <StatCard
            label="Linked feedback"
            value={linkedFeedback}
            icon={MessageSquare}
            tone="amber"
            href={productHref(managedProductId, "roadmap")}
          />
          <StatCard
            label="Feedback votes"
            value={insights?.linkedFeedbackVoteCount ?? 0}
            icon={ThumbsUp}
            tone="emerald"
            href={productHref(managedProductId, "roadmap")}
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
  return (
    <div>
      <h2 className="mb-1 text-sm font-medium text-foreground">
        Customer response
      </h2>
      <p className="mb-3 max-w-[65ch] text-sm text-muted-foreground text-pretty">
        Widget submissions for this product. Each count opens that status.
      </p>
      <StatCardGrid cols={4}>
        <StatCard
          label="Open"
          value={insights?.submissionsByStatus.open ?? 0}
          icon={Inbox}
          tone="default"
          href={productHref(managedProductId, "feedback?status=open")}
        />
        <StatCard
          label="In progress"
          value={insights?.submissionsByStatus.in_progress ?? 0}
          icon={BarChart2}
          tone="amber"
          href={productHref(managedProductId, "feedback?status=in_progress")}
        />
        <StatCard
          label="Resolved"
          value={insights?.submissionsByStatus.resolved ?? 0}
          icon={CheckCircle2}
          tone="emerald"
          href={productHref(managedProductId, "feedback?status=resolved")}
        />
        <StatCard
          label="Archived"
          value={insights?.submissionsByStatus.archived ?? 0}
          icon={FolderOpen}
          tone="default"
          href={productHref(managedProductId, "feedback?status=archived")}
        />
      </StatCardGrid>
    </div>
  );
}

export function InsightDiscoveryPanel({
  managedProductId,
}: {
  managedProductId: number;
}) {
  return <ProductDiscoverySection managedProductId={managedProductId} />;
}
