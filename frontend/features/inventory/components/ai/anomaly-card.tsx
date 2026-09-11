"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { InvAnomalyRow } from "@/hooks/api/inventory/ai-review";

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

export function AnomalyCard({ row, canManage, isPending, onReview }: AnomalyCardProps) {
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
