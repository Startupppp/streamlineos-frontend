"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import Link from "next/link";
import {
  useUpdateCandidateStage,
  useDeleteCandidate,
  useBulkRejectCandidates,
} from "@/hooks/api/hr";
import { useCandidatesPage } from "@/hooks/api/hr/recruitment";
import { Button } from "@/components/ui/button";
import { FilterPill, FilterPillGroup } from "@/components/ui/filter-pill";
import { SearchInput } from "@/components/ui/search-input";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { toast } from "sonner";
import {
  Plus,
  XCircle,
  CheckSquare,
  GitCompare,
  Upload,
} from "lucide-react";
import type { Candidate, CandidateStatus } from "@/types/hr";
import {
  EmptyPersonIllustration,
  EmptySearchIllustration,
} from "@/components/illustrations";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { CandidateComparisonDialog } from "@/components/hr/recruitment/candidate-comparison-dialog";
import { AddCandidateSheet } from "@/features/hr/recruitment/candidates-list/add-candidate-sheet";
import { RejectCandidateDialog } from "@/features/hr/recruitment/reject-candidate-dialog";
import type { RejectionDetails } from "@/hooks/api/hr/recruitment/rejection-reasons-schema";
import { EditCandidateSheet } from "@/features/hr/recruitment/candidates-list/edit-candidate-sheet";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
import { TablePagination, useCursorPager } from "@/components/ui/table-pagination";
import {
  CandidateCard,
  CandidateCardSkeleton,
  STAGE_CONFIG,
  StagePillButton,
} from "@/features/hr/recruitment/candidates-list/candidate-card";

export function CandidatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter =
    STAGE_CONFIG.find((stage) => stage.value === searchParams.get("status"))?.value ?? null;
  const [searchQuery, setSearchQueryLocal] = useState(
    searchParams.get("q") ?? "",
  );
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const pager = useCursorPager(`${statusFilter ?? ""}|${debouncedSearch.trim()}`);

  const {
    data: candidatesPage,
    isLoading,
    isError,
    refetch,
  } = useCandidatesPage({
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    ...(pager.cursor ? { cursor: pager.cursor } : {}),
    limit: 24,
  });
  const candidates = candidatesPage?.data;
  const updateCandidateStage = useUpdateCandidateStage();
  const deleteCandidate = useDeleteCandidate();
  const bulkReject = useBulkRejectCandidates();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCandidate, setDeletingCandidate] = useState<Candidate | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [pendingReject, setPendingReject] = useState<{
    candidateId: number;
    candidateName: string;
  } | null>(null);

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "ALL") params.set(key, value);
      else params.delete(key);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleNextPage = useCallback(() => {
    pager.goNext(candidatesPage?.pagination.nextCursor);
  }, [pager, candidatesPage?.pagination.nextCursor]);

  const debouncedSearchRef = useRef(debouncedSearch);
  useEffect(() => {
    if (debouncedSearchRef.current === debouncedSearch) return;
    debouncedSearchRef.current = debouncedSearch;
    setFilter("q", debouncedSearch || null);
  }, [debouncedSearch, setFilter]);

  const filteredCandidates = useMemo(() => candidates ?? [], [candidates]);

  const stageCounts = useMemo(() => {
    const counts = candidatesPage?.statusCounts;
    if (counts && Object.keys(counts).length > 0) {
      return counts as Record<CandidateStatus, number>;
    }
    if (!candidates) return {} as Record<CandidateStatus, number>;
    return candidates.reduce(
      (acc, c) => {
        if (c.status) acc[c.status] = (acc[c.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<CandidateStatus, number>,
    );
  }, [candidates, candidatesPage?.statusCounts]);

  const handleStatusChange = useCallback(
    (id: number, status: CandidateStatus) => {
      /*
        A reject goes through the dialog, never straight to the mutation. The
        endpoint refuses one that carries no reason, so firing here would turn
        picking "Rejected" in the card's dropdown into a 422 toast.
      */
      if (status === "REJECTED") {
        const candidate = filteredCandidates.find((c) => c.id === id);
        setPendingReject({
          candidateId: id,
          candidateName: candidate
            ? `${candidate.firstName} ${candidate.lastName}`
            : `Candidate #${id}`,
        });
        return;
      }
      updateCandidateStage.mutate(
        { candidateId: id, stage: status },
        {
          onSuccess: () => toast.success("Stage updated"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateCandidateStage, filteredCandidates],
  );

  const handleConfirmReject = useCallback(
    (rejection: RejectionDetails) => {
      if (!pendingReject) return;
      updateCandidateStage.mutate(
        { candidateId: pendingReject.candidateId, stage: "REJECTED", ...rejection },
        {
          onSuccess: () => toast.success("Candidate rejected"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
      setPendingReject(null);
    },
    [pendingReject, updateCandidateStage],
  );

  const handleCancelReject = useCallback(() => setPendingReject(null), []);

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
          toast.success(
            `${res.rejected} rejected, ${res.emailsSent} emails sent`,
          );
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
  function handleSearchChange(value: string) {
    setSearchQueryLocal(value);
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
        subtitle="Manage and track your recruiting pipeline"
        filters={
          <div className={FILTER_TOOLBAR_ROW}>
            <SearchInput placeholder="Search candidates…" value={searchQuery} onValueChange={handleSearchChange} />
            <FilterPillGroup>
              <FilterPill active={!statusFilter} onClick={handleClearStatusFilter}>
                All · {candidates?.length ?? 0}
              </FilterPill>
              {STAGE_CONFIG.map((s) => (
                <StagePillButton
                  key={s.value}
                  stage={s}
                  count={stageCounts[s.value] ?? 0}
                  isActive={statusFilter === s.value}
                  onFilter={setFilter}
                />
              ))}
            </FilterPillGroup>
          </div>
        }
        actions={
          <>
            {selectedIds.size > 0 && (
              <>
                <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-micro font-bold text-primary-foreground">
                      {selectedIds.size}
                    </span>
                  </div>
                  <span className="hidden sm:inline">selected</span>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1.5 text-xs"
                  onClick={handleOpenBulkReject}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reject</span>
                </Button>
                {selectedIds.size >= 2 && selectedIds.size <= 4 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={handleOpenCompare}
                  >
                    <GitCompare className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Compare</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={handleClearSelection}
                >
                  Clear
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleSelectAll}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {selectedIds.size === filteredCandidates.length &&
                filteredCandidates.length > 0
                  ? "Deselect all"
                  : "Select all"}
              </span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              asChild
            >
              <Link href="/hr/recruitment/candidates/import">
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Import</span>
              </Link>
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleOpenAddSheet}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Candidate</span>
            </Button>
          </>
        }
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <CandidateCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Unable to load candidates"
            description="Try again. If this keeps happening, check your permissions or contact an admin."
            onRetry={() => void refetch()}
          />
        ) : filteredCandidates.length === 0 ? (
          <RecruitmentEmptyState
            illustration={
              searchQuery ? (
                <EmptySearchIllustration />
              ) : (
                <EmptyPersonIllustration />
              )
            }
            title={
              searchQuery
                ? "No candidates match your search"
                : "No candidates yet"
            }
            description={
              searchQuery
                ? "Try a different search term or clear the filter"
                : "Add your first candidate to start building your pipeline"
            }
            action={
              searchQuery
                ? undefined
                : { label: "Add Candidate", onClick: handleOpenAddSheet }
            }
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <>
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
            <TablePagination
              mode="cursor"
              rowCount={filteredCandidates.length}
              hasMore={candidatesPage?.pagination.hasMore ?? false}
              hasPrevious={pager.hasPrevious}
              onNext={handleNextPage}
              onPrevious={pager.goPrevious}
            />
          </>
        )}
        </div>
      </PageWrapper>

      <RejectCandidateDialog
        candidateName={pendingReject?.candidateName ?? null}
        isPending={updateCandidateStage.isPending}
        onCancel={handleCancelReject}
        onConfirm={handleConfirmReject}
      />
      <ConfirmSheet
        open={bulkRejectOpen}
        onOpenChange={setBulkRejectOpen}
        title={`Reject ${selectedIds.size} candidate(s)?`}
        description="This will move all selected candidates to Rejected and send automated rejection emails. This action cannot be undone."
        confirmLabel={`Reject ${selectedIds.size} Candidate(s)`}
        destructive
        isPending={bulkReject.isPending}
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
      <ConfirmSheet
        open={deleteDialogOpen}
        onOpenChange={handleCloseDeleteDialog}
        title="Delete candidate?"
        description={`This will permanently delete ${deletingCandidate?.firstName} ${deletingCandidate?.lastName} and all related data. This cannot be undone.`}
        confirmLabel="Delete Candidate"
        destructive
        isPending={deleteCandidate.isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
