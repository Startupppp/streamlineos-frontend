"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { ChevronDownIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useFeedbucketSubmission,
  useUpdateFeedbucketSubmission,
} from "@/hooks/api/feedbucket/use-feedbucket-submissions";
import { FeedbucketAiPanel } from "./feedbucket-ai-panel";
import type {
  FeedbucketSubmissionStatus,
  FeedbucketSubmissionPriority,
  FeedbucketConsoleEntry,
  FeedbucketMetadata,
  FeedbucketNetworkEntry,
} from "@/types/feedbucket";
import { TruncatedText } from "@/components/ui/truncated-text";

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
          <TruncatedText text={r.value ?? ""} className="text-foreground text-right max-w-[220px]" />
        </div>
      ))}
    </div>
  );
}

function ConsoleLogsPanel({ logs }: { logs: FeedbucketConsoleEntry[] }) {
  const [open, setOpen] = useState(false);
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleToggle() {
    setOpen((prev) => !prev);
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
        {...hoverHandlers}
      >
        <span>Console Logs ({logs.length})</span>
        {open ? <ChevronDownIcon ref={iconRef} size={16} /> : <ChevronRightIcon ref={iconRef} size={16} />}
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

function statusColor(entry: FeedbucketNetworkEntry): string {
  if (!entry.ok || entry.status === 0) return "text-red-500";
  if (entry.status >= 500) return "text-red-500";
  if (entry.status >= 400) return "text-amber-500";
  return "text-green-600";
}

function NetworkLogsPanel({ logs }: { logs: FeedbucketNetworkEntry[] }) {
  const [open, setOpen] = useState(false);
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleToggle() {
    setOpen((prev) => !prev);
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
        {...hoverHandlers}
      >
        <span>Network ({logs.length})</span>
        {open ? <ChevronDownIcon ref={iconRef} size={16} /> : <ChevronRightIcon ref={iconRef} size={16} />}
      </button>
      {open && (
        <div className="border-t border-border bg-muted/30 p-3 max-h-72 overflow-y-auto">
          <table className="w-full text-xs border-separate border-spacing-y-0.5">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left font-medium w-12 py-1">Method</th>
                <th className="text-left font-medium w-14 py-1">Status</th>
                <th className="text-left font-medium py-1">URL</th>
                <th className="text-right font-medium w-16 py-1">Duration</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((entry, i) => (
                <tr key={i} className="font-mono">
                  <td className="py-0.5 pr-2">
                    <span className="inline-block rounded px-1 bg-muted text-muted-foreground uppercase text-[10px]">
                      {entry.method}
                    </span>
                  </td>
                  <td className={`py-0.5 pr-2 font-semibold ${statusColor(entry)}`}>
                    {entry.status === 0 ? "FAIL" : entry.status}
                  </td>
                  <td className="py-0.5 pr-2 max-w-0">
                    <TruncatedText text={entry.url} className="text-foreground" />
                  </td>
                  <td className="py-0.5 text-right text-muted-foreground">
                    {entry.durationMs}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  const [convertedTicketId, setConvertedTicketId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-1 min-h-0 flex-col space-y-4">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !submission) {
    return <ErrorState description="Failed to load submission." onRetry={refetch} />;
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

  return (
    <div className="flex flex-col gap-6">
      {submission.screenshotUrl && (
        <div className="rounded-xl border border-border overflow-hidden bg-muted/20">
          <img
            src={submission.screenshotUrl}
            alt="Feedback screenshot"
            className="w-full object-contain max-h-[480px]"
          />
        </div>
      )}

      {submission.recordingUrl && (
        <div className="rounded-xl border border-border overflow-hidden bg-muted/20">
          <video
            controls
            src={submission.recordingUrl}
            className="w-full max-h-[480px]"
            aria-label="Screen recording"
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
              <SelectTrigger className="text-sm">
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
              <SelectTrigger className="text-sm">
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

      {submission.networkLogs && submission.networkLogs.length > 0 && (
        <NetworkLogsPanel logs={submission.networkLogs} />
      )}

      <FeedbucketAiPanel
        submissionId={submissionId}
        hasScreenshot={!!submission.screenshotUrl}
        existingAnalysis={submission.aiAnalysis}
        linkedTicketId={linkedTicketId}
        linkedTicketKey={null}
        projectId={projectId}
        onTicketCreated={setConvertedTicketId}
      />
    </div>
  );
}
