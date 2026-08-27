"use client";

import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { ErrorState } from "@/components/shared";
import { AiGeneratedLabel } from "@/components/ai/ai-generated-label";
import { getErrorMessage } from "@/lib/get-error-message";
import { useInventoryDigest } from "@/hooks/api/inv-ai-explain";

const GROUP_LABELS: Record<string, string> = {
  stockout_risk: "Stockout risk",
  dead_stock: "Dead stock",
  vendor_delay: "Vendor delays",
  negative_stock: "Negative stock",
  unusual_adjustments: "Unusual adjustments",
  expiry_risk: "Expiry risk",
};

const GROUP_ROUTES: Record<string, string> = {
  stockout_risk: "/inventory/replenishment",
  dead_stock: "/inventory/reports/slow-moving",
  vendor_delay: "/inventory/purchase-orders",
  negative_stock: "/inventory/stock",
  unusual_adjustments: "/inventory/stock/adjustments",
  expiry_risk: "/inventory/expiry",
};

function groupLabel(type: string): string {
  return GROUP_LABELS[type] ?? type.replaceAll("_", " ");
}

function getTotalSeverity(group: { severityCounts: Record<string, number> }): string {
  if ((group.severityCounts.high ?? 0) > 0) return "high";
  if ((group.severityCounts.medium ?? 0) > 0) return "medium";
  return "low";
}

export function InventoryAiBriefCard() {
  const digest = useInventoryDigest();

  function handleGenerate(): void {
    void digest.refetch();
  }

  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          AI operations brief
          <AiGeneratedLabel />
        </CardTitle>
        <CardAction>
          <LoadingButton
            type="button"
            variant="outline"
            size="sm"
            isPending={digest.isFetching}
            loadingText="Reading…"
            onClick={handleGenerate}
          >
            {digest.isFetched ? "Refresh brief" : "Generate brief"}
          </LoadingButton>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 pt-3">
        {digest.error ? (
          <div className="space-y-2">
            <ErrorState
              compact
              title="Brief unavailable"
              description={getErrorMessage(digest.error)}
              onRetry={handleGenerate}
            />
          </div>
        ) : digest.data ? (
          <>
            <p className="max-w-3xl text-sm leading-relaxed text-foreground">
              {digest.data.narration ?? "No new inventory risk was detected."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-micro bg-primary/5">
                {digest.data.totalNew} open signal{digest.data.totalNew === 1 ? "" : "s"}
              </Badge>
              {digest.data.groups.map((group) => (
                <Link
                  key={group.insightType}
                  href={GROUP_ROUTES[group.insightType] ?? "/inventory"}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-micro text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${getTotalSeverity(group) === "high" ? "bg-status-danger-fill" : getTotalSeverity(group) === "medium" ? "bg-status-warning-fill" : "bg-status-info-fill"}`}
                    aria-hidden="true"
                  />
                  {groupLabel(group.insightType)} · {group.count}
                  <ArrowRight className="h-2.5 w-2.5" aria-hidden="true" />
                </Link>
              ))}
            </div>
            <p className="text-micro text-muted-foreground">
              Based on the current inventory signal set. Numbers and records remain sourced from deterministic reports.
            </p>
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">Start with a clear read of what needs attention.</p>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Generate a short, evidence-backed brief from stockout risk, expiry, supplier delays, and other open inventory signals.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
