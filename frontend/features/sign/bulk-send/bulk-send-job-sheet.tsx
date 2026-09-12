"use client";

import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { CircleAlert, CircleCheck, Rows3 } from "lucide-react";
import { CopyIcon } from "@animateicons/react/lucide";
import { AppSheet } from "@/components/shared/app-sheet";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { statusToneClasses } from "@/lib/design-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { useBulkSendJob, useBulkSendJobErrorReport } from "@/hooks/api/sign/bulk-send";
import type { SignBulkSendJob, SignBulkSendRow } from "@/types/sign";
import { failedRowsCsv, rowIdentity } from "./bulk-send-row-utils";

interface BulkSendJobSheetProps {
  jobId: number | undefined;
  templateName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROW_TONE = {
  failed: "danger",
  success: "success",
  pending: "neutral",
} as const;

function formatStamp(value: string | null): string {
  if (!value) return "—";
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? "—" : format(parsed, "d MMM yyyy, HH:mm");
}

function RowCard({ row, mapping }: { row: SignBulkSendRow; mapping: Record<string, string> }) {
  const tone = statusToneClasses(ROW_TONE[row.status]);
  const identity = rowIdentity(row, mapping);

  return (
    <li className="rounded-md border border-border/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium break-words">{identity.name || "Unnamed row"}</p>
          {identity.email && <p className="text-xs text-muted-foreground break-all">{identity.email}</p>}
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground shrink-0">Row {row.rowNumber}</span>
      </div>
      {row.errorMessage ? (
        <p className={cn("mt-2 rounded-md border px-2 py-1 text-xs", tone.surface, tone.rule, tone.ink)}>
          {row.errorMessage}
        </p>
      ) : (
        <Badge variant="outline" className="mt-2 h-5 px-2 py-0.5 text-xs">
          {row.status}
        </Badge>
      )}
    </li>
  );
}

function CoverageNote({ shown, total, noun, reason }: { shown: number; total: number; noun: string; reason: string }) {
  if (shown >= total) return null;
  const warning = statusToneClasses("warning");
  return (
    <p className={cn("rounded-md border p-3 text-xs", warning.surface, warning.rule, warning.ink)}>
      Showing {shown} of {total} {noun}. {reason}
    </p>
  );
}

export function BulkSendJobSheet({ jobId, templateName, open, onOpenChange }: BulkSendJobSheetProps) {
  const canRun = useCan("sign:bulk_send:run");
  const enabled = open && canRun;
  const detail = useBulkSendJob(enabled ? jobId : undefined);
  const errorReport = useBulkSendJobErrorReport(enabled ? jobId : undefined);

  const job: SignBulkSendJob | undefined = detail.data?.job;
  const rows = detail.data?.rows ?? [];
  const failedRows = errorReport.data?.rows ?? [];
  const mapping = job?.columnMappingJson ?? {};

  async function handleCopyFailures() {
    try {
      await navigator.clipboard.writeText(failedRowsCsv(failedRows, mapping));
      toast.success("Failed rows copied as CSV");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={templateName ?? "Bulk send job"}
      description={jobId === undefined ? undefined : `Job #${jobId}`}
      className="sm:max-w-xl"
    >
      {!canRun ? (
        <EmptyState
          title="You cannot view bulk send jobs"
          description="Opening a bulk send job needs the SignOS bulk send permission."
          compact
        />
      ) : detail.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : detail.isError || !job ? (
        <ErrorState title="Failed to load this bulk send job" onRetry={() => void detail.refetch()} compact />
      ) : (
        <div className="space-y-4">
          <StatCardGrid cols={3}>
            <StatCard label="Rows" value={job.totalCount} icon={Rows3} />
            <StatCard label="Sent" value={job.successCount} icon={CircleCheck} tone="emerald" />
            <StatCard label="Failed" value={job.failedCount} icon={CircleAlert} tone="red" />
          </StatCardGrid>

          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd>
                <Badge variant="outline" className="h-5 px-2 py-0.5 text-xs">
                  {job.status}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Started</dt>
              <dd className="tabular-nums">{formatStamp(job.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Finished</dt>
              <dd className="tabular-nums">{formatStamp(job.completedAt)}</dd>
            </div>
          </dl>

          <Tabs defaultValue={job.failedCount > 0 ? "failed" : "all"}>
            <TabsList>
              <TabsTrigger value="failed">Failed rows</TabsTrigger>
              <TabsTrigger value="all">All rows</TabsTrigger>
            </TabsList>

            <TabsContent value="failed" className="space-y-3">
              {errorReport.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : errorReport.isError ? (
                <ErrorState
                  title="Failed to load the error report"
                  onRetry={() => void errorReport.refetch()}
                  compact
                />
              ) : failedRows.length === 0 ? (
                <EmptyState
                  title="No failed rows"
                  description="Every row in this job was accepted."
                  compact
                />
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {failedRows.length} row(s) failed
                    </p>
                    <AnimatedIconButton
                      icon={CopyIcon}
                      iconClassName="mr-1.5"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyFailures}
                    >
                      Copy as CSV
                    </AnimatedIconButton>
                  </div>
                  <CoverageNote
                    shown={failedRows.length}
                    total={errorReport.data?.failedCount ?? job.failedCount}
                    noun="failed rows"
                    reason={`The error report stops at ${errorReport.data?.limit ?? failedRows.length} failed rows, so the rest are not in this list.`}
                  />
                  <ul className="space-y-2">
                    {failedRows.map((row) => (
                      <RowCard key={row.id} row={row} mapping={mapping} />
                    ))}
                  </ul>
                </>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-3">
              {rows.length === 0 ? (
                <EmptyState title="No rows" description="This job has no rows recorded." compact />
              ) : (
                <>
                  <CoverageNote
                    shown={rows.length}
                    total={detail.data?.rowTotal ?? job.totalCount}
                    noun="rows"
                    reason="The API returns the first 100 rows of a job, so anything numbered beyond that is not in this list."
                  />
                  <ul className="space-y-2">
                    {rows.map((row) => (
                      <RowCard key={row.id} row={row} mapping={mapping} />
                    ))}
                  </ul>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </AppSheet>
  );
}
