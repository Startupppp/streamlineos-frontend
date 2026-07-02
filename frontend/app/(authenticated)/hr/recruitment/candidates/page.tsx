"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import React, { useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCandidates, useUpdateCandidateStage, useDeleteCandidate, useBulkRejectCandidates } from "@/hooks/api/hr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus, Search, Mail, Phone, Star, XCircle, CheckSquare,
  GitCompare, MoreVertical, Pencil, Trash2, Building2, Clock, ArrowLeft, Users,
  Upload,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Candidate, CandidateStatus } from "@/types/hr";
import { AIScoreCandidateButton } from "@/features/hr/recruitment/ai-score-candidate-button";
import { CandidateComparisonDialog } from "@/components/hr/recruitment/candidate-comparison-dialog";
import { AddCandidateSheet } from "@/features/hr/recruitment/candidates-list/add-candidate-sheet";
import { EditCandidateSheet } from "@/features/hr/recruitment/candidates-list/edit-candidate-sheet";
import { cn } from "@/lib/utils";

const STAGE_CONFIG: {
  value: CandidateStatus;
  label: string;
  accent: string;
  pill: string;
  dot: string;
  activePill: string;
}[] = [
  {
    value: "NEW",
    label: "New",
    accent: "border-l-slate-400",
    pill: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    dot: "bg-slate-400",
    activePill: "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-800",
  },
  {
    value: "SCREENING",
    label: "Screening",
    accent: "border-l-blue-500",
    pill: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    dot: "bg-blue-500",
    activePill: "bg-blue-600 text-white",
  },
  {
    value: "INTERVIEW",
    label: "Interview",
    accent: "border-l-amber-500",
    pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    dot: "bg-amber-500",
    activePill: "bg-amber-600 text-white",
  },
  {
    value: "OFFER",
    label: "Offer",
    accent: "border-l-violet-500",
    pill: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    dot: "bg-violet-500",
    activePill: "bg-violet-600 text-white",
  },
  {
    value: "HIRED",
    label: "Hired",
    accent: "border-l-emerald-500",
    pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
    activePill: "bg-emerald-600 text-white",
  },
  {
    value: "REJECTED",
    label: "Rejected",
    accent: "border-l-rose-400",
    pill: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    dot: "bg-rose-400",
    activePill: "bg-rose-600 text-white",
  },
];

const SOURCE_LABELS: Record<string, string> = {
  DIRECT: "Direct",
  REFERRAL: "Referral",
  LINKEDIN: "LinkedIn",
  JOB_PORTAL: "Job Portal",
  CAMPUS: "Campus",
  CAREERS_PAGE: "Careers Page",
  NAUKRI: "Naukri",
};

function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function getStageConfig(status: CandidateStatus | null) {
  return STAGE_CONFIG.find((s) => s.value === status) ?? STAGE_CONFIG[0];
}

function StagePillButton({
  stage,
  count,
  isActive,
  onFilter,
}: {
  stage: (typeof STAGE_CONFIG)[number];
  count: number;
  isActive: boolean;
  onFilter: (key: string, value: string) => void;
}) {
  function handleClick() { onFilter("status", stage.value); }
  return (
    <button
      onClick={handleClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5",
        isActive ? stage.activePill + " shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", isActive ? "bg-current opacity-70" : stage.dot)} />
      {stage.label} · {count}
    </button>
  );
}

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  onEdit: (candidate: Candidate) => void;
  onDelete: (candidate: Candidate) => void;
  onToggleSelect: (id: number, checked: boolean) => void;
  onStatusChange: (id: number, status: CandidateStatus) => void;
}

function CandidateCard({
  candidate,
  isSelected,
  onEdit,
  onDelete,
  onToggleSelect,
  onStatusChange,
}: CandidateCardProps) {
  const cfg = getStageConfig(candidate.status);

  function handleStopPropagation(e: React.MouseEvent) { e.stopPropagation(); }
  function handleCheckboxChange(e: React.ChangeEvent<HTMLInputElement>) {
    onToggleSelect(candidate.id, e.target.checked);
  }
  function handleEditClick() { onEdit(candidate); }
  function handleDeleteClick() { onDelete(candidate); }
  function handleStatusChange(v: string) { onStatusChange(candidate.id, v as CandidateStatus); }

  return (
    <div
      className={cn(
        "relative group rounded-2xl border bg-card border-l-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        cfg.accent,
        isSelected
          ? "border-primary/30 ring-2 ring-primary/20 shadow-sm"
          : "border-border/70",
      )}
    >
      <div className="absolute top-3 right-3 flex items-center gap-1 z-10" onClick={handleStopPropagation}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          aria-label={`Select ${candidate.firstName} ${candidate.lastName}`}
          className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={handleEditClick}>
              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleDeleteClick}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Link href={`/hr/recruitment/candidates/${candidate.id}`} className="block p-5 pr-16">
        <div className="flex items-start gap-3 mb-3">
          <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-gradient-to-br from-primary/20 to-primary/10 text-primary border border-primary/20">
            {getInitials(candidate.firstName, candidate.lastName)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground truncate leading-tight">
              {candidate.firstName} {candidate.lastName}
            </h3>
            {candidate.currentRole && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {candidate.currentRole}
                {candidate.currentCompany && ` · ${candidate.currentCompany}`}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{candidate.email}</span>
          </div>
          {candidate.phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{candidate.phone}</span>
            </div>
          )}
          {candidate.source && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="font-medium text-foreground/80">{SOURCE_LABELS[candidate.source] ?? candidate.source}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", cfg.pill)}>
            {cfg.label}
          </span>
          {candidate.rating !== null && candidate.rating !== undefined && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-3 w-3",
                    i < candidate.rating!
                      ? "text-amber-500 fill-amber-500"
                      : "text-border fill-transparent",
                  )}
                />
              ))}
            </div>
          )}
          {candidate.createdAt && (
            <div className="flex items-center gap-0.5 ml-auto text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {formatDistanceToNow(new Date(candidate.createdAt), { addSuffix: true })}
            </div>
          )}
        </div>
      </Link>

      <div className="px-5 pb-4 flex items-center gap-2" onClick={handleStopPropagation}>
        <AIScoreCandidateButton candidateId={candidate.id} compact />
        <Select value={candidate.status ?? "NEW"} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-7 flex-1 text-xs bg-muted/40 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="w-[var(--radix-select-trigger-width)]">
            {STAGE_CONFIG.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                <span className="flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
                  {s.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function CandidateCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card border-l-4 border-l-muted p-5 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-11 w-11 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

export default function CandidatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") as CandidateStatus | null;
  const searchQuery = searchParams.get("q") ?? "";

  const { data: candidates, isLoading } = useCandidates(
    statusFilter ? { status: statusFilter } : undefined
  );
  const updateCandidateStage = useUpdateCandidateStage();
  const deleteCandidate = useDeleteCandidate();
  const bulkReject = useBulkRejectCandidates();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCandidate, setDeletingCandidate] = useState<Candidate | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "ALL") params.set(key, value);
      else params.delete(key);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const filteredCandidates = useMemo(() => {
    if (!candidates) return [];
    if (!searchQuery) return candidates;
    const q = searchQuery.toLowerCase();
    return candidates.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.currentCompany?.toLowerCase().includes(q)
    );
  }, [candidates, searchQuery]);

  const stageCounts = useMemo(() => {
    if (!candidates) return {} as Record<CandidateStatus, number>;
    return candidates.reduce(
      (acc, c) => {
        if (c.status) acc[c.status] = (acc[c.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<CandidateStatus, number>
    );
  }, [candidates]);

  const handleStatusChange = useCallback(
    (id: number, status: CandidateStatus) => {
      updateCandidateStage.mutate({ candidateId: id, stage: status }, {
        onSuccess: () => toast.success("Stage updated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [updateCandidateStage]
  );

  const openEditSheet = useCallback((candidate: Candidate) => {
    setEditingCandidate(candidate);
    setEditSheetOpen(true);
  }, []);

  const openDeleteDialog = useCallback((candidate: Candidate) => {
    setDeletingCandidate(candidate);
    setDeleteDialogOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    if (!deletingCandidate) return;
    deleteCandidate.mutate(deletingCandidate.id, {
      onSuccess: () => {
        toast.success("Candidate deleted");
        setDeleteDialogOpen(false);
        setDeletingCandidate(null);
        setSelectedIds((prev) => { const n = new Set(prev); n.delete(deletingCandidate.id); return n; });
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deletingCandidate, deleteCandidate]);

  const handleToggleSelect = useCallback((id: number, checked: boolean) => {
    setSelectedIds((prev) => { const n = new Set(prev); if (checked) n.add(id); else n.delete(id); return n; });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = filteredCandidates.map((c) => c.id);
    setSelectedIds((prev) => prev.size === allIds.length ? new Set() : new Set(allIds));
  }, [filteredCandidates]);

  const handleBulkReject = useCallback(() => {
    bulkReject.mutate(
      { candidateIds: Array.from(selectedIds), sendRejectionEmail: true },
      {
        onSuccess: (res) => {
          toast.success(`${res.rejected} rejected, ${res.emailsSent} emails sent`);
          setSelectedIds(new Set());
          setBulkRejectOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [selectedIds, bulkReject]);

  const handleCloseEditSheet = useCallback((open: boolean) => {
    setEditSheetOpen(open);
    if (!open) setEditingCandidate(null);
  }, []);

  const handleCloseDeleteDialog = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) setDeletingCandidate(null);
  }, []);

  function handleOpenBulkReject() { setBulkRejectOpen(true); }
  function handleOpenCompare() { setCompareOpen(true); }
  function handleClearSelection() { setSelectedIds(new Set()); }
  function handleOpenAddSheet() { setSheetOpen(true); }
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) { setFilter("q", e.target.value || null); }
  function handleClearStatusFilter() { setFilter("status", null); }
  function handleCloseCompare() { setCompareOpen(false); }

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 pb-10">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
            <Link href="/hr/recruitment" aria-label="Back to recruitment">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Candidates</h1>
            <p className="text-xs text-muted-foreground">{filteredCandidates.length} in pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {selectedIds.size > 0 && (
            <>
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary-foreground">{selectedIds.size}</span>
                </div>
                selected
              </div>
              <Button size="sm" variant="destructive" className="h-8 gap-1.5 text-xs" onClick={handleOpenBulkReject}>
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
              {selectedIds.size >= 2 && selectedIds.size <= 4 && (
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleOpenCompare}>
                  <GitCompare className="h-3.5 w-3.5" /> Compare
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={handleClearSelection}>
                Clear
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleSelectAll}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {selectedIds.size === filteredCandidates.length && filteredCandidates.length > 0 ? "Deselect all" : "Select all"}
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" asChild>
            <Link href="/hr/recruitment/candidates/import">
              <Upload className="h-3.5 w-3.5" /> Import
            </Link>
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleOpenAddSheet}>
            <Plus className="h-3.5 w-3.5" /> Add Candidate
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 bg-muted/40 rounded-lg p-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search candidates…"
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={handleClearStatusFilter}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer",
              !statusFilter
                ? "bg-foreground text-background shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            All · {candidates?.length ?? 0}
          </button>
          {STAGE_CONFIG.map((s) => (
            <StagePillButton
              key={s.value}
              stage={s}
              count={stageCounts[s.value] ?? 0}
              isActive={statusFilter === s.value}
              onFilter={setFilter}
            />
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CandidateCardSkeleton key={i} />)}
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-24 gap-4 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {searchQuery ? "No candidates match your search" : "No candidates yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {searchQuery
                ? "Try a different search term or clear the filter"
                : "Add your first candidate to start building your pipeline"}
            </p>
          </div>
          {!searchQuery && (
            <Button size="sm" className="gap-1.5" onClick={handleOpenAddSheet}>
              <Plus className="h-4 w-4" /> Add Candidate
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              isSelected={selectedIds.has(candidate.id)}
              onEdit={openEditSheet}
              onDelete={openDeleteDialog}
              onToggleSelect={handleToggleSelect}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={bulkRejectOpen}
        onOpenChange={setBulkRejectOpen}
        title={`Reject ${selectedIds.size} candidate(s)?`}
        description="This will move all selected candidates to Rejected and send automated rejection emails. This action cannot be undone."
        confirmLabel={bulkReject.isPending ? "Rejecting…" : `Reject ${selectedIds.size} Candidate(s)`}
        destructive
        onConfirm={handleBulkReject}
      />
      {compareOpen && (
        <CandidateComparisonDialog
          candidates={filteredCandidates.filter((c) => selectedIds.has(c.id))}
          onClose={handleCloseCompare}
        />
      )}
      <AddCandidateSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      <EditCandidateSheet
        open={editSheetOpen}
        candidate={editingCandidate}
        onOpenChange={handleCloseEditSheet}
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={handleCloseDeleteDialog}
        title="Delete candidate?"
        description={`This will permanently delete ${deletingCandidate?.firstName} ${deletingCandidate?.lastName} and all related data. This cannot be undone.`}
        confirmLabel={deleteCandidate.isPending ? "Deleting…" : "Delete Candidate"}
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
