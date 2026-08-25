"use client";

import { useCallback, memo, useState } from "react";
import { Sparkles } from "lucide-react";
import { CheckCheckIcon, XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState } from "@/components/shared";
import { TruncatedText } from "@/components/ui/truncated-text";
import { InsightExplanationPanel } from "@/features/inventory/components/insight-explanation-panel";
import { useInventoryInsights, useGenerateInsights, useUpdateInsight } from "@/hooks/api/inventory/ai";
import type { AiInsight } from "@/hooks/api/inventory/reports";

const SEVERITY_CLASS: Record<string, string> = {
  high: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  medium: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  low: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
};

const SEVERITY_LABEL: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function getSeverityClass(severity: string): string {
  return SEVERITY_CLASS[severity.toLowerCase()] ?? "bg-muted text-muted-foreground border-border";
}

function getSeverityLabel(severity: string): string {
  return SEVERITY_LABEL[severity.toLowerCase()] ?? severity;
}

interface InsightRowProps {
  insight: AiInsight;
  onAcknowledge: (id: number) => void;
  onDismiss: (id: number) => void;
  isPending: boolean;
}

const InsightRow = memo(function InsightRow({
  insight,
  onAcknowledge,
  onDismiss,
  isPending,
}: InsightRowProps) {
  const [expanded, setExpanded] = useState(false);

  function handleAcknowledge(): void {
    onAcknowledge(insight.id);
  }

  function handleDismiss(): void {
    onDismiss(insight.id);
  }

  function handleToggleExpand(): void {
    setExpanded((v) => !v);
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-start gap-3 p-3">
        <Badge
          variant="outline"
          className={`text-[9px] h-4 px-1.5 py-0 shrink-0 mt-0.5 ${getSeverityClass(insight.severity)}`}
        >
          {getSeverityLabel(insight.severity)}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="text-dense font-semibold text-foreground">{insight.title}</p>
          <TruncatedText text={insight.body} className="text-dense text-muted-foreground" lines={2} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-[9px]"
            title={expanded ? "Collapse" : "Explain"}
            onClick={handleToggleExpand}
          >
            <Sparkles className="h-3 w-3 text-blue-500" aria-hidden="true" />
          </Button>
          <AnimatedIconButton
            icon={CheckCheckIcon}
            iconSize={12}
            iconClassName="text-emerald-600"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Acknowledge"
            onClick={handleAcknowledge}
            disabled={isPending}
          />
          <AnimatedIconButton
            icon={XIcon}
            iconSize={12}
            iconClassName="text-muted-foreground"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Dismiss"
            onClick={handleDismiss}
            disabled={isPending}
          />
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-3">
          <InsightExplanationPanel insight={insight} />
        </div>
      )}
    </div>
  );
});

function InsightsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function DashboardInsightsPanel() {
  const { data, isLoading, error, refetch } = useInventoryInsights({ status: "NEW" });
  const generateInsights = useGenerateInsights();
  const updateInsight = useUpdateInsight();

  const handleAcknowledge = useCallback(
    function handleAcknowledge(id: number): void {
      updateInsight.mutate({ insightId: id, data: { status: "ACKNOWLEDGED" } });
    },
    [updateInsight],
  );

  const handleDismiss = useCallback(
    function handleDismiss(id: number): void {
      updateInsight.mutate({ insightId: id, data: { status: "DISMISSED" } });
    },
    [updateInsight],
  );

  function handleGenerate(): void {
    generateInsights.mutate();
  }

  function handleRetry(): void {
    void refetch();
  }

  const activeInsights = data?.items ?? [];

  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
          AI Insights
        </CardTitle>
        <CardAction>
          <LoadingButton
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={handleGenerate}
            isPending={generateInsights.isPending}
            loadingText="Generating…"
          >
            Generate Insights
          </LoadingButton>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-3">
        {isLoading ? (
          <InsightsSkeleton />
        ) : error ? (
          <ErrorState
            compact
            title="Failed to load insights"
            description="Could not retrieve AI insights."
            onRetry={handleRetry}
          />
        ) : activeInsights.length === 0 ? (
          <InventoryEmptyState
            compact
            title="No active insights"
            description="Generate insights to get AI-powered inventory recommendations."
          />
        ) : (
          <div className="space-y-2">
            {activeInsights.map((insight) => (
              <InsightRow
                key={insight.id}
                insight={insight}
                onAcknowledge={handleAcknowledge}
                onDismiss={handleDismiss}
                isPending={updateInsight.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
