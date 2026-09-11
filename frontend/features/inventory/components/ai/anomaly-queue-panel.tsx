"use client";

import { useState } from "react";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useInventoryAnomalies,
  useReviewInventoryAnomaly,
  type InvAnomalyFilters,
} from "@/hooks/api/inventory/ai-review";
import { AnomalyCard } from "./anomaly-card";

/**
 * F3 — the anomaly queue.
 *
 * The screen this replaces listed findings. This one makes them *reviewable*,
 * which needs three things the list never had.
 *
 * **The formula and the window.** "Stockout risk: SKU-7" is an assertion.
 * "Available quantity is below mean weekly sales over the last 90 days" is an
 * assertion somebody can disagree with, and only the second kind is worth
 * putting in a queue. Both come from the server's detector registry — the same
 * constants the query used — so the caption cannot describe a window nobody ran.
 *
 * **The window as it was.** A finding carries the window it was raised under, so
 * a threshold changed last week does not retroactively rewrite what last
 * month's alert claimed. Where the stored window and the detector's current one
 * disagree, the stored one is what is shown.
 *
 * **A review with a name on it.** Acknowledging records who and when, and asks
 * for a note. Nothing on this screen can post stock: there is no quantity field,
 * no location field, and the route behind these two buttons updates one status
 * column and nothing else.
 */
export function AnomalyQueuePanel() {
  const canRead = useCan("inventory:ai:read");
  const canManage = useCan("inventory:ai:manage");
  const [status, setStatus] = useState<NonNullable<InvAnomalyFilters["status"]>>("NEW");
  const [severity, setSeverity] = useState<string>("all");

  const filters: InvAnomalyFilters = {
    status,
    ...(severity === "all" ? {} : { severity: severity as "high" | "medium" | "low" }),
  };
  const { data, isLoading, error, refetch } = useInventoryAnomalies(filters);
  const review = useReviewInventoryAnomaly();

  if (!canRead) {
    return (
      <NoPermissionState
        permission="inventory:ai:read"
        title="Anomaly queue hidden"
        description="The AI-assisted inventory surfaces need their own read permission."
      />
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <TriangleAlert className="h-3.5 w-3.5 text-status-warning-ink" aria-hidden="true" />
          Anomaly queue
        </CardTitle>
        <CardAction>
          <div className="flex items-center gap-2">
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger size="sm" className="w-32" aria-label="Filter by severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as NonNullable<InvAnomalyFilters["status"]>)
              }
            >
              <SelectTrigger size="sm" className="w-36" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW">Open</SelectItem>
                <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                <SelectItem value="DISMISSED">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3 pt-3">
        {data?.orgWideSignalsHidden ? (
          // The honest gate would otherwise read as a broken screen: four of the
          // six detectors compute across every site, and those findings are not
          // this reader's to see.
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-dense text-muted-foreground">
              Your access is limited to specific warehouses, so this queue shows only
              findings about those sites. Organisation-wide signals — the ones computed
              across every warehouse — are not included.
            </p>
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="Couldn't load the queue"
            description={getErrorMessage(error)}
            onRetry={() => void refetch()}
          />
        ) : (data?.items.length ?? 0) === 0 ? (
          <EmptyState
            illustrationPreset="inventory"
            title="Nothing in the queue"
            description={
              status === "NEW"
                ? "No open anomalies in the warehouses you can see."
                : "Nothing has been reviewed with that status yet."
            }
          />
        ) : (
          <div className="space-y-2">
            {data?.items.map((row) => (
              <AnomalyCard
                key={row.id}
                row={row}
                canManage={canManage}
                isPending={review.isPending}
                onReview={(insightId, action, note) =>
                  review.mutate({ insightId, action, ...(note ? { note } : {}) })
                }
              />
            ))}
          </div>
        )}

        {review.error ? (
          <p className="text-micro text-status-danger-ink">{getErrorMessage(review.error)}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
