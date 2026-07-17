"use client";

import * as React from "react";
import { CheckCircle, XCircle, Loader2, Hash, BarChart2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useImportJob } from "@/hooks/api/inventory/admin";
import type { JobStatus } from "@/features/inventory/lib";
import { JOB_STATUS_BADGE, JOB_STATUS_LABEL } from "@/features/inventory/lib";

const POLLING_STATUSES: JobStatus[] = ["PENDING", "PROCESSING"];

interface ImportResultStepProps {
  jobId: number;
  onReset: () => void;
}

type ErrorRow = { row: number | string; field: string; message: string; _idx: number };

const ERROR_COLUMNS: DataTableColumn<ErrorRow>[] = [
  {
    key: "row",
    header: "Row",
    className: "text-xs text-red-700",
    cell: (e) => e.row,
  },
  {
    key: "field",
    header: "Field",
    className: "text-xs text-red-700",
    cell: (e) => e.field,
  },
  {
    key: "message",
    header: "Message",
    className: "text-xs text-red-700",
    cell: (e) => e.message,
  },
];

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

  const errorData: ErrorRow[] = (job.errors ?? []).map((e, i) => ({ ...e, _idx: i }));

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

      <StatCardGrid cols={3}>
        <StatCard label="Total rows" value={job.totalRows} icon={Hash} tone="default" />
        <StatCard label="Processed" value={job.processedRows} icon={BarChart2} tone="emerald" />
        <StatCard label="Errors" value={job.errorCount} icon={AlertCircle} tone={job.errorCount > 0 ? "red" : "default"} />
      </StatCardGrid>

      {errorData.length > 0 && (
        <DataTable
          data={errorData}
          columns={ERROR_COLUMNS}
          getRowKey={(e) => e._idx}
        />
      )}

      {!isRunning && (
        <Button variant="outline" onClick={onReset}>
          Start new import
        </Button>
      )}
    </div>
  );
}
