"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/date-utils";
import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";

interface PreviewsCardProps {
  managedProductId: number;
  previews: ManagedProductSummary["previews"];
}

type ExtendedPreviews = ManagedProductSummary["previews"] & {
  goals?: Array<{ id: number; title: string; status: string; progress: number }>;
  decisions?: Array<{ id: number; title: string; decidedAt: string | null; note: string | null }>;
  changelogPublished?: number;
};

function progressLabel(progress: number): string {
  return `${progress}%`;
}

export function ManagedProductOverviewPreviewsCard({
  managedProductId,
  previews,
}: PreviewsCardProps) {
  const ext = previews as ExtendedPreviews;
  const goals = ext.goals ?? [];
  const decisions = ext.decisions ?? [];
  const changelogPublished = ext.changelogPublished ?? 0;

  const hasContent = goals.length > 0 || decisions.length > 0 || changelogPublished > 0;
  if (!hasContent) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <h2 className="text-sm font-semibold text-foreground">Goals, decisions & publication</h2>
      </CardHeader>
      <CardContent className="space-y-5">
        {goals.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Linked goals</span>
              <Link
                href={`/build/goals`}
                className="text-xs text-primary underline-offset-2 hover:underline"
              >
                View goals
              </Link>
            </div>
            <div className="space-y-1">
              {goals.map((g) => (
                <Link
                  key={g.id}
                  href={`/build/goals/${g.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm hover:border-primary/40"
                >
                  <span className="truncate">{g.title}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">{g.status}</span>
                    <span className="font-mono tabular-nums text-xs">{progressLabel(g.progress)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {decisions.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Recent decisions</span>
              <Link
                href={`/build/managed-products/${managedProductId}/roadmap`}
                className="text-xs text-primary underline-offset-2 hover:underline"
              >
                View roadmap
              </Link>
            </div>
            <div className="space-y-1">
              {decisions.map((d) => (
                <div
                  key={d.id}
                  className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="truncate font-medium">{d.title}</span>
                    {d.decidedAt ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelativeTime(d.decidedAt)}
                      </span>
                    ) : null}
                  </div>
                  {d.note ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{d.note}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {changelogPublished > 0 && (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Published changelog entries</span>
              <p className="font-mono text-lg font-semibold tabular-nums">{changelogPublished}</p>
            </div>
            <Link
              href={`/build/managed-products/${managedProductId}/roadmap`}
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              View roadmap
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
