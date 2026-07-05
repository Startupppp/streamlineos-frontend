"use client";

import { useCallback, memo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, CheckCheck, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { AiInsight } from "@/hooks/api/inventory/reports";

const SEVERITY_CLASS: Record<AiInsight["severity"], string> = {
  INFO: "bg-blue-50 text-blue-700 border-blue-200",
  WARNING: "bg-amber-50 text-amber-700 border-amber-200",
  CRITICAL: "bg-red-50 text-red-700 border-red-200",
};

const SEVERITY_LABEL: Record<AiInsight["severity"], string> = {
  INFO: "Info",
  WARNING: "Warning",
  CRITICAL: "Critical",
};

interface Props {
  insights: AiInsight[];
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
  function handleAcknowledge(): void {
    onAcknowledge(insight.id);
  }

  function handleDismiss(): void {
    onDismiss(insight.id);
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      <Badge
        variant="outline"
        className={`text-[9px] h-4 px-1.5 py-0 shrink-0 mt-0.5 ${SEVERITY_CLASS[insight.severity]}`}
      >
        {SEVERITY_LABEL[insight.severity]}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-foreground">{insight.title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{insight.description}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title="Acknowledge"
          onClick={handleAcknowledge}
          disabled={isPending}
        >
          <CheckCheck className="h-3 w-3 text-emerald-600" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title="Dismiss"
          onClick={handleDismiss}
          disabled={isPending}
        >
          <X className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
});

export function DashboardInsightsPanel({ insights }: Props) {
  const qc = useQueryClient();

  const acknowledgeInsight = useMutation({
    mutationKey: ["inventory", "ai", "insight", "acknowledge"],
    mutationFn: ({ id, status }: { id: number; status: "ACKNOWLEDGED" | "DISMISSED" }) =>
      apiClient.patch(`/inventory/ai/insights/${id}`, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.aiInsights() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });

  const generateInsights = useMutation({
    mutationKey: ["inventory", "ai", "insights", "generate"],
    mutationFn: () => apiClient.post("/inventory/ai/insights/generate"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });

  const handleAcknowledge = useCallback(
    function handleAcknowledge(id: number): void {
      acknowledgeInsight.mutate({ id, status: "ACKNOWLEDGED" });
    },
    [acknowledgeInsight],
  );

  const handleDismiss = useCallback(
    function handleDismiss(id: number): void {
      acknowledgeInsight.mutate({ id, status: "DISMISSED" });
    },
    [acknowledgeInsight],
  );

  function handleGenerate(): void {
    generateInsights.mutate();
  }

  const activeInsights = insights.filter((i) => i.status === "PENDING");

  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" aria-hidden="true" />
          AI Insights
        </CardTitle>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleGenerate}
            disabled={generateInsights.isPending}
          >
            {generateInsights.isPending ? "Generating…" : "Generate Insights"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-3">
        {activeInsights.length === 0 ? (
          <EmptyState
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
                isPending={acknowledgeInsight.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
