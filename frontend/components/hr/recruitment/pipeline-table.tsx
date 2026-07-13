"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { AtsPipelineStage } from "@/types/hr/recruitment";

const STAGE_BADGE: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  SCREENING: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  INTERVIEW: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  OFFER: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  HIRED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  REJECTED: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
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
        <p className="text-[11px] text-muted-foreground">{row.jobTitle ?? row.email}</p>
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
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
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
              ? "text-rose-600 border-rose-200 dark:text-rose-400 dark:border-rose-500/30"
              : row.slaStatus === "AT_RISK"
                ? "text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-500/30"
                : "text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-500/30"
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
