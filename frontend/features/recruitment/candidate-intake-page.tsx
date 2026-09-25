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
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { RecruitmentEmptyState } from "@/features/recruitment/components/recruitment-empty-state";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { EmptyPersonIllustration } from "@/components/illustrations";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, XCircle, AlertTriangle, Sparkles } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import { DuplicateResolutionDialog } from "@/features/recruitment/candidates-list/duplicate-resolution-dialog";
import type { DuplicateCandidateGroup } from "@/hooks/api/hr/recruitment";
import type { Candidate } from "@/types/hr";
import { formatDistanceToNow } from "date-fns";

interface CandidateIntakeRowProps {
  candidate: Candidate;
  isSelected: boolean;
  duplicate: DuplicateCandidateGroup | undefined;
  onToggle: (id: number) => void;
  onShowDuplicate: (group: DuplicateCandidateGroup) => void;
}

function CandidateIntakeRow({ candidate: c, isSelected, duplicate, onToggle, onShowDuplicate }: CandidateIntakeRowProps) {
  function handleCheckedChange() {
    onToggle(c.id);
  }
  function handleDuplicateClick() {
    if (duplicate) onShowDuplicate(duplicate);
  }
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
      <Checkbox checked={isSelected} onCheckedChange={handleCheckedChange} />
      <div className="w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-dense font-bold text-primary">
        {c.firstName?.[0]}{c.lastName?.[0]}
      </div>
      <Link href={`/recruitment/candidates/${c.id}`} className="flex-1 min-w-0 group">
        <TruncatedText text={`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()} className="text-sm font-medium text-foreground group-hover:text-primary transition-colors" />
        <p className="text-dense text-muted-foreground mt-0.5">{c.email}</p>
      </Link>
      <div className="flex items-center gap-2 shrink-0">
        {c.source && (
          <Badge variant="outline" className="text-micro">{c.source.replace(/_/g, " ")}</Badge>
        )}
        {typeof c.aiScore === "number" && (
          <Badge variant="secondary" className="text-micro gap-1">
            <Sparkles className="h-2.5 w-2.5" />
            {c.aiScore}
          </Badge>
        )}
        {duplicate && !c.duplicateOfId && (
          <button
            type="button"
            onClick={handleDuplicateClick}
            className="inline-flex items-center gap-1 text-micro font-medium px-2 py-0.5 rounded-full bg-status-warning-surface text-status-warning-ink hover:bg-status-warning-fill-hover transition-colors"
          >
            <AlertTriangle className="h-2.5 w-2.5" />
            Possible duplicate
          </button>
        )}
        {c.createdAt && (
          <span className="text-dense text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );
}

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
  /*
    `INTERNAL` is written by the internal-mobility apply path and was
    missing from every list on this side, so an employee who applied for an
    internal opening became a candidate this filter could not select.
  */
  { value: "INTERNAL", label: "Internal" },
];

export function CandidateIntakePage() {
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

  function handleOpenReject() { setRejectOpen(true); }
  function handleRetry() { void refetch(); }
  function handleCloseDuplicateDialog() { setDuplicateGroup(null); }

  return (
    <>
      <PageWrapper
        title="Intake Inbox"
        subtitle="Triage new applicants before they enter the pipeline"
        filters={
          <div className={FILTER_TOOLBAR_ROW}>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className={cn("w-[150px]", FILTER_SELECT_TRIGGER)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className={cn("w-[180px]", FILTER_SELECT_TRIGGER)}>
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
              <LoadingButton size="sm" variant="outline" className="gap-1.5" onClick={handleBulkShortlist} isPending={bulkShortlist.isPending} loadingText="Shortlisting…">
                <CheckCircle2 className="h-3.5 w-3.5 text-status-success-ink" />
                Shortlist
              </LoadingButton>
              <Button size="sm" variant="outline" className="gap-1.5 text-destructive" onClick={handleOpenReject}>
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </Button>
            </div>
          ) : undefined
        }
      >
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : isError ? (
          <ErrorState className="flex-1" title="Failed to load applicants" onRetry={handleRetry} />
        ) : isEmpty ? (
          <RecruitmentEmptyState
            illustration={<EmptyPersonIllustration />}
            title="No new applicants right now"
            description="New applications will show up here for triage before entering the pipeline."
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60 bg-muted/30">
              <Checkbox checked={selectedIds.size === candidates?.length && candidates.length > 0} onCheckedChange={handleToggleAll} />
              <span className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
                Candidate
              </span>
            </div>
            <div className="divide-y divide-border/50">
              {candidates?.map((c) => (
                <CandidateIntakeRow
                  key={c.id}
                  candidate={c}
                  isSelected={selectedIds.has(c.id)}
                  duplicate={duplicateByCandidateId.get(c.id)}
                  onToggle={handleToggle}
                  onShowDuplicate={setDuplicateGroup}
                />
              ))}
            </div>
          </div>
        )}
      </PageWrapper>

      <ConfirmSheet
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={`Reject ${selectedIds.size} candidate${selectedIds.size !== 1 ? "s" : ""}?`}
        description="This will notify each candidate and remove them from active consideration."
        confirmLabel="Reject"
        destructive
        isPending={bulkReject.isPending}
        onConfirm={handleBulkReject}
      />

      {duplicateGroup && (
        <DuplicateResolutionDialog group={duplicateGroup} onClose={handleCloseDuplicateDialog} />
      )}
    </>
  );
}
