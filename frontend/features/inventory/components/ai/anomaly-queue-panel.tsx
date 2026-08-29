"use client";

import { useState } from "react";
import { Info, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useInventoryAnomalies,
  useReviewInventoryAnomaly,
  type InvAnomalyFilters,
  type InvAnomalyRow,
} from "@/hooks/api/inventory/ai-review";

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

const SEVERITY_CLASS: Record<string, string> = {
  high: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  medium: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  low: "bg-status-info-surface text-status-info-ink border-status-info-rule",
};

const STATUS_LABEL: Record<string, string> = {
  NEW: "Open",
  ACKNOWLEDGED: "Acknowledged",
  DISMISSED: "Dismissed",
};

function severityClass(severity: string): string {
  return SEVERITY_CLASS[severity.toLowerCase()] ?? "bg-muted text-muted-foreground border-border";
}

/**
 * What the row itself says its window was, preferred over the registry's current
 * one. A finding is a claim about a moment, and the moment includes the
 * threshold that was in force.
 */
function windowCaption(row: InvAnomalyRow): string | null {
  if (row.windowDays !== null && row.detector) {
    return `${row.detector.windowLabel} · measured over ${row.windowDays} day${row.windowDays === 1 ? "" : "s"} when raised`;
  }
  return row.detector?.windowLabel ?? null;
}

interface AnomalyCardProps {
  row: InvAnomalyRow;
  canManage: boolean;
  isPending: boolean;
  onReview: (insightId: number, action: "acknowledge" | "dismiss", note?: string) => void;
}

function AnomalyCard({ row, canManage, isPending, onReview }: AnomalyCardProps) {
  const [reviewing, setReviewing] = useState<"acknowledge" | "dismiss" | null>(null);
  const [note, setNote] = useState("");
  const open = row.status === "NEW";
  const caption = windowCaption(row);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-start gap-3 p-3">
        <Badge
          variant="outline"
          className={`text-micro mt-0.5 h-4 shrink-0 px-1.5 py-0 ${severityClass(row.severity)}`}
        >
          {row.severity}
        </Badge>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-dense font-semibold text-foreground">{row.title}</p>
          <TruncatedText
            text={row.body}
            className="text-dense text-muted-foreground"
            lines={2}
          />

          {row.detector ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-default items-center gap-1 text-micro text-muted-foreground">
                    <Info className="h-3 w-3" aria-hidden="true" />
                    How this was detected
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm">
                  <p className="font-medium">{row.detector.label}</p>
                  <p>{row.detector.formula}</p>
                  <p className="text-muted-foreground">{row.detector.severityRule}</p>
                </TooltipContent>
              </Tooltip>
              {caption ? (
                <span className="text-micro text-muted-foreground">{caption}</span>
              ) : null}
              <a
                className="text-micro text-primary underline-offset-2 hover:underline"
                href={row.detector.href}
              >
                Open the screen that computed it
              </a>
            </div>
          ) : (
            <p className="text-micro text-muted-foreground">
              Raised by a detector this build no longer computes. Its figures still
              stand; the formula behind them is not available here.
            </p>
          )}

          <p className="text-micro text-muted-foreground">
            {row.evidence.length} record{row.evidence.length === 1 ? "" : "s"} cited
            {row.warehouseId === null
              ? " · organisation-wide"
              : ` · warehouse ${row.warehouseId}`}
            {row.evidenceHash ? ` · evidence ${row.evidenceHash.slice(0, 8)}` : ""}
          </p>

          {!open ? (
            <p className="text-micro text-muted-foreground">
              {STATUS_LABEL[row.status] ?? row.status}
              {row.acknowledgedAt
                ? ` on ${new Date(row.acknowledgedAt).toLocaleString()}`
                : ""}
              {row.resolutionNote ? ` — “${row.resolutionNote}”` : ""}
            </p>
          ) : null}
        </div>

        {canManage && open ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-micro"
              disabled={isPending}
              onClick={() => setReviewing("acknowledge")}
            >
              Acknowledge
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-micro"
              disabled={isPending}
              onClick={() => setReviewing("dismiss")}
            >
              Dismiss
            </Button>
          </div>
        ) : null}
      </div>

      {reviewing ? (
        <div className="space-y-2 border-t border-border/60 p-3">
          <label className="text-micro text-muted-foreground" htmlFor={`note-${row.id}`}>
            {reviewing === "acknowledge"
              ? "What did you do about it? (optional, and the next person will thank you)"
              : "Why is this not worth acting on? (optional)"}
          </label>
          <Textarea
            id={`note-${row.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={500}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => {
                setReviewing(null);
                setNote("");
              }}
            >
              Cancel
            </Button>
            <LoadingButton
              type="button"
              size="sm"
              isPending={isPending}
              loadingText="Saving…"
              onClick={() => {
                onReview(row.id, reviewing, note.trim() || undefined);
                setReviewing(null);
                setNote("");
              }}
            >
              {reviewing === "acknowledge" ? "Acknowledge" : "Dismiss"}
            </LoadingButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

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
