"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useFeedbucketSubmission,
  useUpdateFeedbucketSubmission,
  useConvertFeedbucketToTicket,
} from "@/hooks/api/feedbucket/use-feedbucket-submissions";
import type {
  FeedbucketSubmissionStatus,
  FeedbucketSubmissionPriority,
  FeedbucketConsoleEntry,
  FeedbucketMetadata,
} from "@/types/feedbucket";

const STATUS_LABELS: Record<FeedbucketSubmissionStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  archived: "Archived",
};

const PRIORITY_LABELS: Record<FeedbucketSubmissionPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

function MetadataPanel({ meta }: { meta: FeedbucketMetadata }) {
  const rows: Array<{ label: string; value: string | undefined }> = [
    { label: "Browser", value: meta.browser ? `${meta.browser} ${meta.browserVersion ?? ""}`.trim() : undefined },
    { label: "OS", value: meta.os },
    { label: "Device", value: meta.device },
    { label: "Screen", value: meta.screenW && meta.screenH ? `${meta.screenW}×${meta.screenH}` : undefined },
    { label: "Viewport", value: meta.viewportW && meta.viewportH ? `${meta.viewportW}×${meta.viewportH}` : undefined },
    { label: "Language", value: meta.language },
    { label: "Referrer", value: meta.referrer },
  ];
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Environment</p>
      {rows.filter((r) => r.value).map((r) => (
        <div key={r.label} className="flex justify-between gap-4 text-sm">
          <span className="text-muted-foreground">{r.label}</span>
          <span className="text-foreground text-right truncate max-w-[220px]">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function ConsoleLogsPanel({ logs }: { logs: FeedbucketConsoleEntry[] }) {
  const [open, setOpen] = useState(false);

  function handleToggle() {
    setOpen((prev) => !prev);
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <span>Console Logs ({logs.length})</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="border-t border-border bg-muted/30 p-3 max-h-64 overflow-y-auto">
          {logs.map((entry, i) => (
            <div key={i} className="font-mono text-xs leading-5 flex gap-2">
              <span className="text-muted-foreground w-12 flex-shrink-0">[{entry.level}]</span>
              <span className="text-foreground break-all">{entry.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface FeedbucketSubmissionDetailProps {
  submissionId: number;
}

export function FeedbucketSubmissionDetail({ submissionId }: FeedbucketSubmissionDetailProps) {
  const { data: submission, isLoading, isError, refetch } = useFeedbucketSubmission(submissionId);
  const updateMutation = useUpdateFeedbucketSubmission();
  const convertMutation = useConvertFeedbucketToTicket();
  const [convertedTicketId, setConvertedTicketId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !submission) {
    return <ErrorState description="Failed to load submission." onRetry={refetch} className="m-6" />;
  }

  const linkedTicketId = convertedTicketId ?? submission.linkedTicketId;
  const projectId = submission.widget?.projectId;

  async function handleStatusChange(value: string) {
    try {
      await updateMutation.mutateAsync({
        submissionId,
        input: { status: value as FeedbucketSubmissionStatus },
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handlePriorityChange(value: string) {
    try {
      await updateMutation.mutateAsync({
        submissionId,
        input: { priority: value === "none" ? null : (value as FeedbucketSubmissionPriority) },
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleConvertToTicket() {
    try {
      const result = await convertMutation.mutateAsync(submissionId);
      setConvertedTicketId(result.ticketId);
      toast.success("Converted to ticket");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-4xl mx-auto">
      {submission.screenshotUrl && (
        <div className="rounded-xl border border-border overflow-hidden bg-muted/20">
          <img
            src={submission.screenshotUrl}
            alt="Feedback screenshot"
            className="w-full object-contain max-h-[480px]"
          />
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{submission.message}</p>
          </div>
          {submission.pageUrl && (
            <a
              href={submission.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-accent hover:underline flex-shrink-0"
            >
              <ExternalLink className="h-3 w-3" />
              View page
            </a>
          )}
        </div>
        <Separator />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Status</p>
            <Select value={submission.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["open", "in_progress", "resolved", "archived"] as FeedbucketSubmissionStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Priority</p>
            <Select
              value={submission.priority ?? "none"}
              onValueChange={handlePriorityChange}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(["low", "medium", "high", "urgent"] as FeedbucketSubmissionPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Submitted</p>
            <p className="text-sm text-foreground pt-1">
              {format(new Date(submission.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
      </div>

      {submission.reporterName || submission.reporterEmail ? (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reporter</p>
          {submission.reporterName && <p className="text-sm text-foreground">{submission.reporterName}</p>}
          {submission.reporterEmail && (
            <p className="text-sm text-muted-foreground">{submission.reporterEmail}</p>
          )}
        </div>
      ) : null}

      {submission.metadata && Object.keys(submission.metadata).length > 0 && (
        <MetadataPanel meta={submission.metadata} />
      )}

      {submission.consoleLogs && submission.consoleLogs.length > 0 && (
        <ConsoleLogsPanel logs={submission.consoleLogs} />
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        {linkedTicketId ? (
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-xs">Linked Ticket #{linkedTicketId}</Badge>
            {projectId && (
              <Link
                href={`/projects/${projectId}/tickets/${linkedTicketId}`}
                className="flex items-center gap-1 text-sm text-accent hover:underline"
              >
                View ticket
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        ) : (
          <Button
            size="sm"
            onClick={handleConvertToTicket}
            disabled={convertMutation.isPending}
          >
            {convertMutation.isPending ? "Converting…" : "Convert to Ticket"}
          </Button>
        )}
      </div>
    </div>
  );
}
