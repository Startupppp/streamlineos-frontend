"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Star } from "lucide-react";
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

interface PipelineTableProps {
  stages: AtsPipelineStage[];
  isLoading: boolean;
}

export function PipelineTable({ stages, isLoading }: PipelineTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  const rows = stages.flatMap((s) => s.candidates.map((c) => ({ ...c, stage: s.stage })));

  if (!rows.length) {
    return (
      <RecruitmentEmptyState
        illustrationPreset="team"
        title="No candidates in the pipeline"
        description="Candidates will appear here once they enter the hiring flow."
      />
    );
  }

  const sorted = [...rows].sort((a, b) => {
    const aDate = a.appliedAt ? new Date(a.appliedAt).getTime() : 0;
    const bDate = b.appliedAt ? new Date(b.appliedAt).getTime() : 0;
    return bDate - aDate;
  });

  return (
    <div className="h-full overflow-y-auto px-4 py-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Candidate</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>SLA</TableHead>
            <TableHead className="text-right">Applied</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((c) => (
            <TableRow key={c.applicationId ?? c.id} className="hover:bg-muted/40">
              <TableCell>
                <Link href={`/hr/recruitment/candidates/${c.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                  {c.name}
                </Link>
                <p className="text-[11px] text-muted-foreground">{c.jobTitle ?? c.email}</p>
              </TableCell>
              <TableCell>
                <Badge className={STAGE_BADGE[c.stage] ?? STAGE_BADGE.NEW} variant="outline">{c.stage}</Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{c.source ?? "—"}</TableCell>
              <TableCell>
                {c.rating ? (
                  <span className="flex items-center gap-0.5 text-xs">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {c.rating}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {c.slaStatus ? (
                  <Badge
                    variant="outline"
                    className={
                      c.slaStatus === "BREACHED"
                        ? "text-rose-600 border-rose-200"
                        : c.slaStatus === "AT_RISK"
                          ? "text-amber-600 border-amber-200"
                          : "text-emerald-600 border-emerald-200"
                    }
                  >
                    {c.slaStatus.replace(/_/g, " ")}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">
                {c.appliedAt ? formatDistanceToNow(new Date(c.appliedAt), { addSuffix: true }) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
