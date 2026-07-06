"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  useCandidates,
  useBulkRejectCandidates,
  useBulkShortlistCandidates,
  useCandidateDuplicates,
  useJobPostings,
} from "@/hooks/api/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { EmptyPersonIllustration } from "@/components/illustrations";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, XCircle, AlertTriangle, Sparkles } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import { DuplicateResolutionDialog } from "@/features/hr/recruitment/candidates-list/duplicate-resolution-dialog";
import type { DuplicateCandidateGroup } from "@/hooks/api/hr/recruitment";
import { formatDistanceToNow } from "date-fns";

const SOURCE_OPTIONS = [
  { value: "ALL", label: "All sources" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "NAUKRI", label: "Naukri" },
  { value: "INDEED", label: "Indeed" },
  { value: "REFERRAL", label: "Referral" },
  { value: "CAREERS_PAGE", label: "Careers page" },
  { value: "DIRECT", label: "Direct" },
  { value: "JOB_PORTAL", label: "Job portal" },
  { value: "CAMPUS", label: "Campus" },
];

export default function IntakeInboxPage() {
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [jobFilter, setJobFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [rejectOpen, setRejectOpen] = useState(false);
  const [duplicateGroup, setDuplicateGroup] = useState<DuplicateCandidateGroup | null>(null);

  const { data: candidates, isLoading, isError, refetch } = useCandidates({
    status: "NEW",
    source: sourceFilter !== "ALL" ? sourceFilter : undefined,
    jobId: jobFilter !== "ALL" ? Number(jobFilter) : undefined,
  });
  const { data: jobs } = useJobPostings({ status: "OPEN" });
  const { data: duplicateGroups } = useCandidateDuplicates();
  const bulkReject = useBulkRejectCandidates();
  const bulkShortlist = useBulkShortlistCandidates();

  const duplicateByCandidateId = useMemo(() => {
    const map = new Map<number, DuplicateCandidateGroup>();
    for (const group of duplicateGroups ?? []) {
      for (const c of group.candidates) map.set(c.id, group);
    }
    return map;
  }, [duplicateGroups]);

  const handleToggle = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === candidates?.length ? new Set() : new Set(candidates?.map((c) => c.id) ?? []),
    );
  }, [candidates]);

  const handleBulkShortlist = useCallback(() => {
    bulkShortlist.mutate(Array.from(selectedIds), {
      onSuccess: (data) => {
        toast.success(`${data.shortlisted} candidate${data.shortlisted !== 1 ? "s" : ""} shortlisted`);
        setSelectedIds(new Set());
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [selectedIds, bulkShortlist]);

  const handleBulkReject = useCallback(() => {
    bulkReject.mutate(
      { candidateIds: Array.from(selectedIds), sendRejectionEmail: true },
      {
        onSuccess: (data) => {
          toast.success(`${data.rejected} candidate${data.rejected !== 1 ? "s" : ""} rejected`);
          setSelectedIds(new Set());
          setRejectOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [selectedIds, bulkReject]);

  const isEmpty = !isLoading && !isError && (!candidates || candidates.length === 0);

  return (
    <>
      <PageWrapper
        title="Intake Inbox"
        subtitle="Triage new applicants before they enter the pipeline"
        badge={candidates ? `${candidates.length}` : undefined}
        filters={
          <div className="flex items-center gap-2">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[150px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="w-[180px] h-8 text-sm">
                <SelectValue placeholder="All jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All jobs</SelectItem>
                {jobs?.map((j) => (
                  <SelectItem key={j.id} value={String(j.id)}>{j.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        actions={
          selectedIds.size > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={handleBulkShortlist} disabled={bulkShortlist.isPending}>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Shortlist
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-destructive" onClick={() => setRejectOpen(true)}>
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </Button>
            </div>
          ) : undefined
        }
      >
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <p className="text-sm font-semibold text-foreground">Failed to load applicants</p>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>Try again</Button>
          </div>
        ) : isEmpty ? (
          <RecruitmentEmptyState
            illustration={<EmptyPersonIllustration />}
            title="No new applicants right now"
            description="New applications will show up here for triage before entering the pipeline."
            className="border-0 bg-transparent shadow-none"
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60 bg-muted/30">
              <Checkbox checked={selectedIds.size === candidates?.length && candidates.length > 0} onCheckedChange={handleToggleAll} />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Candidate
              </span>
            </div>
            <div className="divide-y divide-border/50">
              {candidates?.map((c) => {
                const duplicate = duplicateByCandidateId.get(c.id);
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => handleToggle(c.id)} />
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-[11px] font-bold text-primary">
                      {c.firstName?.[0]}{c.lastName?.[0]}
                    </div>
                    <Link href={`/hr/recruitment/candidates/${c.id}`} className="flex-1 min-w-0 group">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{c.email}</p>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.source && (
                        <Badge variant="outline" className="text-[10px]">{c.source.replace(/_/g, " ")}</Badge>
                      )}
                      {typeof c.aiScore === "number" && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Sparkles className="h-2.5 w-2.5" />
                          {c.aiScore}
                        </Badge>
                      )}
                      {duplicate && !c.duplicateOfId && (
                        <button
                          type="button"
                          onClick={() => setDuplicateGroup(duplicate)}
                          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200 transition-colors"
                        >
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Possible duplicate
                        </button>
                      )}
                      {c.createdAt && (
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </PageWrapper>

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={`Reject ${selectedIds.size} candidate${selectedIds.size !== 1 ? "s" : ""}?`}
        description="This will notify each candidate and remove them from active consideration."
        confirmLabel={bulkReject.isPending ? "Rejecting…" : "Reject"}
        destructive
        onConfirm={handleBulkReject}
      />

      {duplicateGroup && (
        <DuplicateResolutionDialog group={duplicateGroup} onClose={() => setDuplicateGroup(null)} />
      )}
    </>
  );
}
