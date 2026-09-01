"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Info,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { useMotionVariants } from "@/lib/motion-variants";
import { useCan } from "@/hooks/api/access";
import { useAttentionBoard, type AttentionItem, type AttentionSeverity } from "@/hooks/api/inventory/ops-board";

/**
 * B2 — the exceptions board.
 *
 * Severity is carried by an **icon and a word**, never by colour alone: an
 * operator with a red-green deficiency has to be able to tell a stockout from a
 * quarantine, and half of a warehouse floor is looking at a screen in daylight.
 * The colour is a second signal on top of those, not the signal.
 */
const SEVERITY: Record<
  AttentionSeverity,
  { label: string; icon: typeof AlertTriangle; surface: string; rule: string; ink: string; dot: string }
> = {
  critical: {
    label: "Critical",
    icon: CircleAlert,
    surface: "bg-status-danger-surface",
    rule: "border-status-danger-rule",
    ink: "text-status-danger-ink",
    dot: "bg-status-danger-fill",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    surface: "bg-status-warning-surface",
    rule: "border-status-warning-rule",
    ink: "text-status-warning-ink",
    dot: "bg-status-warning-fill",
  },
  info: {
    label: "For review",
    icon: Info,
    surface: "bg-status-info-surface",
    rule: "border-status-info-rule",
    ink: "text-status-info-ink",
    dot: "bg-status-info-fill",
  },
};

function AttentionCard({ item, index }: { item: AttentionItem; index: number }) {
  const { fadeUp } = useMotionVariants();
  const tone = SEVERITY[item.severity];
  const Icon = tone.icon;

  return (
    <motion.li
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      // Capped so a board of eleven cards does not take a second to appear.
      transition={{ delay: Math.min(index, 6) * 0.03 }}
      className="list-none"
    >
      <Link
        href={item.href}
        className={`group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${tone.surface} ${tone.rule}`}
      >
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.ink}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-foreground">{item.title}</span>
            <Badge variant="outline" className={`h-4 px-1.5 py-0 text-micro ${tone.rule} ${tone.ink}`}>
              {tone.label}
            </Badge>
          </div>
          <p className="mt-0.5 text-dense text-muted-foreground">{item.detail}</p>
          {item.actionLabel ? (
            <span className="mt-1.5 inline-flex items-center gap-1 text-dense font-medium text-foreground">
              {item.actionLabel}
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          ) : null}
        </div>
        <span className="shrink-0 text-right">
          <span className="block text-lg font-semibold tabular-nums text-foreground">{item.count}</span>
          <span className="sr-only">
            {item.count} {item.title.toLowerCase()}, severity {tone.label}
          </span>
        </span>
      </Link>
    </motion.li>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
          <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-6 w-8" />
        </div>
      ))}
    </div>
  );
}

export function NeedsAttentionBoard() {
  const canRead = useCan("inventory:stock:read");
  const { data, isLoading, isFetching, error, refetch } = useAttentionBoard();

  const items = data?.items ?? [];
  const criticalCount = items.filter((i) => i.severity === "critical").length;

  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-status-warning-ink" aria-hidden="true" />
          Needs Attention
          {criticalCount > 0 ? (
            <Badge
              variant="outline"
              className="h-4 border-status-danger-rule px-1.5 py-0 text-micro text-status-danger-ink"
            >
              {criticalCount} critical
            </Badge>
          ) : null}
        </CardTitle>
        <CardAction>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {isFetching ? "Refreshing" : "Refresh"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-3">
        {!canRead ? (
          <NoPermissionState
            compact
            permission="inventory:stock:read"
            title="Exceptions hidden"
            description="The attention board reads stock levels, which needs stock access."
          />
        ) : isLoading ? (
          <BoardSkeleton />
        ) : error ? (
          <ErrorState
            compact
            title="Could not load exceptions"
            description="The attention board could not be retrieved."
            onRetry={() => void refetch()}
          />
        ) : items.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-status-success-rule bg-status-success-surface p-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-status-success-ink" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">Nothing needs a decision</p>
              <p className="text-dense text-muted-foreground">
                No stockouts, no delayed transfers, no stock held past its expiry.
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item, i) => (
              <AttentionCard key={item.key} item={item} index={i} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
