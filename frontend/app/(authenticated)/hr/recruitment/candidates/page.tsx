"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import React, { useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useCandidates,
  useUpdateCandidateStage,
  useDeleteCandidate,
  useBulkRejectCandidates,
} from "@/hooks/api/hr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Plus, Search, XCircle, CheckSquare, GitCompare, Users, Upload } from "lucide-react";
import type { Candidate, CandidateStatus } from "@/types/hr";
import { CandidateComparisonDialog } from "@/components/hr/recruitment/candidate-comparison-dialog";
import { AddCandidateSheet } from "@/features/hr/recruitment/candidates-list/add-candidate-sheet";
import { EditCandidateSheet } from "@/features/hr/recruitment/candidates-list/edit-candidate-sheet";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  CandidateCard,
  CandidateCardSkeleton,
  STAGE_CONFIG,
  StagePillButton,
} from "@/features/hr/recruitment/candidates-list/candidate-card";

export default function CandidatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") as CandidateStatus | null;
  const searchQuery = searchParams.get("q") ?? "";

  const { data: candidates, isLoading } = useCandidates(
    statusFilter ? { status: statusFilter } : undefined,
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
    [searchParams, router],
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
        c.currentCompany?.toLowerCase().includes(q),
    );
  }, [candidates, searchQuery]);

  const stageCounts = useMemo(() => {
    if (!candidates) return {} as Record<CandidateStatus, number>;
    return candidates.reduce(
      (acc, c) => {
        if (c.status) acc[c.status] = (acc[c.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<CandidateStatus, number>,
    );
  }, [candidates]);

  const handleStatusChange = useCallback(
    (id: number, status: CandidateStatus) => {
      updateCandidateStage.mutate(
        { candidateId: id, stage: status },
        {
          onSuccess: () => toast.success("Stage updated"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateCandidateStage],
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
        setSelectedIds((prev) => {
          const n = new Set(prev);
          n.delete(deletingCandidate.id);
          return n;
        });
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deletingCandidate, deleteCandidate]);

  const handleToggleSelect = useCallback((id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (checked) n.add(id);
      else n.delete(id);
      return n;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = filteredCandidates.map((c) => c.id);
    setSelectedIds((prev) =>
      prev.size === allIds.length ? new Set() : new Set(allIds),
    );
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
      },
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

  function handleOpenBulkReject() {
    setBulkRejectOpen(true);
  }
  function handleOpenCompare() {
    setCompareOpen(true);
  }
  function handleClearSelection() {
    setSelectedIds(new Set());
  }
  function handleOpenAddSheet() {
    setSheetOpen(true);
  }
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFilter("q", e.target.value || null);
  }
  function handleClearStatusFilter() {
    setFilter("status", null);
  }
  function handleCloseCompare() {
    setCompareOpen(false);
  }

  return (
    <>
      <PageWrapper
        title="Candidates"
        subtitle={`${filteredCandidates.length} in pipeline`}
        backHref="/hr/recruitment"
        filters={
          <div className="flex flex-col sm:flex-row gap-2 w-full">
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
        }
        actions={
          <>
            {selectedIds.size > 0 && (
              <>
                <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary-foreground">
                      {selectedIds.size}
                    </span>
                  </div>
                  selected
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 gap-1.5 text-xs"
                  onClick={handleOpenBulkReject}
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </Button>
                {selectedIds.size >= 2 && selectedIds.size <= 4 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={handleOpenCompare}
                  >
                    <GitCompare className="h-3.5 w-3.5" /> Compare
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={handleClearSelection}
                >
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
              {selectedIds.size === filteredCandidates.length && filteredCandidates.length > 0
                ? "Deselect all"
                : "Select all"}
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" asChild>
              <Link href="/hr/recruitment/candidates/import">
                <Upload className="h-3.5 w-3.5" /> Import
              </Link>
            </Button>
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleOpenAddSheet}>
              <Plus className="h-3.5 w-3.5" /> Add Candidate
            </Button>
          </>
        }
      >
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CandidateCardSkeleton key={i} />
            ))}
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
      </PageWrapper>

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
    </>
  );
}
