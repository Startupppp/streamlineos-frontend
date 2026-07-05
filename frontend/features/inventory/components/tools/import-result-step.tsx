"use client";

import * as React from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useImportJob } from "@/hooks/api/inventory/admin";
import type { JobStatus } from "@/features/inventory/lib";
import { JOB_STATUS_BADGE, JOB_STATUS_LABEL } from "@/features/inventory/lib";

const POLLING_STATUSES: JobStatus[] = ["PENDING", "PROCESSING"];

interface ImportResultStepProps {
  jobId: number;
  onReset: () => void;
}

export function ImportResultStep({ jobId, onReset }: ImportResultStepProps) {
  const [isPolling, setIsPolling] = React.useState(true);
  const { data: job, isLoading } = useImportJob(jobId, isPolling ? 2000 : false);

  React.useEffect(
    function stopPollingOnCompletion() {
      if (!job) return;
      if (!POLLING_STATUSES.includes(job.status)) {
        setIsPolling(false);
      }
    },
    [job],
  );

  if (isLoading || !job) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading job status…
      </div>
    );
  }

  const isRunning = POLLING_STATUSES.includes(job.status);
  const isCompleted = job.status === "COMPLETED";
  const isFailed = job.status === "FAILED";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {isRunning && <Loader2 className="h-5 w-5 animate-spin text-amber-500" />}
        {isCompleted && <CheckCircle className="h-5 w-5 text-emerald-500" />}
        {isFailed && <XCircle className="h-5 w-5 text-red-500" />}
        <Badge className={JOB_STATUS_BADGE[job.status]}>
          {JOB_STATUS_LABEL[job.status]}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">Total rows</p>
          <p className="font-semibold">{job.totalRows}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">Processed</p>
          <p className="font-semibold">{job.processedRows}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">Errors</p>
          <p className={`font-semibold ${job.errorCount > 0 ? "text-red-600" : ""}`}>
            {job.errorCount}
          </p>
        </div>
      </div>

      {job.errors && job.errors.length > 0 && (
        <div className="rounded-lg border border-red-200 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {job.errors.map(function renderError(err, idx) {
                return (
                  <TableRow key={idx}>
                    <TableCell className="text-xs text-red-700">{err.row}</TableCell>
                    <TableCell className="text-xs text-red-700">{err.field}</TableCell>
                    <TableCell className="text-xs text-red-700">{err.message}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {!isRunning && (
        <Button variant="outline" onClick={onReset}>
          Start new import
        </Button>
      )}
    </div>
  );
}
