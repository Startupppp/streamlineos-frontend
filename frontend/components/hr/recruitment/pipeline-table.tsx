"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { AtsPipelineStage } from "@/types/hr/recruitment";

const STAGE_BADGE: Record<string, string> = {
  NEW: "bg-muted text-muted-foreground dark:bg-slate-800",
  SCREENING: "bg-status-info-surface text-status-info-ink",
  INTERVIEW: "bg-status-info-surface text-status-info-ink",
  OFFER: "bg-primary/10 text-foreground dark:bg-primary/10 dark:text-foreground",
  HIRED: "bg-status-success-surface text-status-success-ink",
  REJECTED: "bg-status-danger-surface text-status-danger-ink",
};

type PipelineRow = {
  applicationId?: number | null;
  id: number;
  name: string;
  jobTitle?: string | null;
  email?: string;
  source?: string | null;
  rating?: number | null;
  slaStatus?: string | null;
  appliedAt?: Date | string | null;
  stage: string;
};

interface PipelineTableProps {
  stages: AtsPipelineStage[];
  isLoading: boolean;
}

const PIPELINE_COLUMNS: DataTableColumn<PipelineRow>[] = [
  {
    key: "candidate",
    header: "Candidate",
    cell: (row) => (
      <div>
        <Link
          href={`/hr/recruitment/candidates/${row.id}`}
          className="text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          {row.name}
        </Link>
        <p className="text-dense text-muted-foreground">{row.jobTitle ?? row.email}</p>
      </div>
    ),
  },
  {
    key: "stage",
    header: "Stage",
    cell: (row) => (
      <Badge className={STAGE_BADGE[row.stage] ?? STAGE_BADGE.NEW} variant="outline">
        {row.stage}
      </Badge>
    ),
  },
  {
    key: "source",
    header: "Source",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">{row.source ?? "—"}</span>
    ),
  },
  {
    key: "rating",
    header: "Rating",
    cell: (row) =>
      row.rating ? (
        <span className="flex items-center gap-0.5 text-xs">
          <Star className="h-3 w-3 fill-amber-400 text-status-warning-ink" />
          {row.rating}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    key: "slaStatus",
    header: "SLA",
    cell: (row) =>
      row.slaStatus ? (
        <Badge
          variant="outline"
          className={
            row.slaStatus === "BREACHED"
              ? "text-status-danger-ink border-status-danger-rule"
              : row.slaStatus === "AT_RISK"
                ? "text-status-warning-ink border-status-warning-rule"
                : "text-status-success-ink border-status-success-rule"
          }
        >
          {row.slaStatus.replace(/_/g, " ")}
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    key: "applied",
    header: "Applied",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {row.appliedAt ? formatDistanceToNow(new Date(row.appliedAt), { addSuffix: true }) : "—"}
      </span>
    ),
  },
];

function getRowKey(row: PipelineRow) {
  return row.applicationId ?? row.id;
}

export function PipelineTable({ stages, isLoading }: PipelineTableProps) {
  const rows = stages
    .flatMap((s) => s.candidates.map((c) => ({ ...c, stage: s.stage })))
    .sort((a, b) => {
      const aDate = a.appliedAt ? new Date(a.appliedAt).getTime() : 0;
      const bDate = b.appliedAt ? new Date(b.appliedAt).getTime() : 0;
      return bDate - aDate;
    });

  return (
    <div className="h-full overflow-y-auto px-4 py-2">
      <DataTable
        data={rows}
        columns={PIPELINE_COLUMNS}
        getRowKey={getRowKey}
        isLoading={isLoading}
        emptyState={
          <RecruitmentEmptyState
            illustrationPreset="team"
            title="No candidates in the pipeline"
            description="Candidates will appear here once they enter the hiring flow."
          />
        }
      />
    </div>
  );
}
