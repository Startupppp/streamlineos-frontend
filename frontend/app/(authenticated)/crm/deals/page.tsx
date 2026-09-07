"use client";

import { useState, useMemo, useCallback, useTransition, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { ConfettiOverlay } from "@/components/celebration/confetti-overlay";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DealList } from "@/features/crm/deals/deal-list";
import { DealsFilterBar } from "@/features/crm/deals/deals-filter-bar";
import { useDensity } from "@/components/renderer/density-toggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useMotionVariants } from "@/lib/motion-variants";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useDeals, useUpdateDealStage, useDeleteDeal, useCrmPipelines } from "@/hooks/api/crm";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import type { Deal, DealFilters, DealStage } from "@/types/crm";
import { useHrEmployees } from "@/hooks/api/hr";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { DealSidePanel } from "@/features/crm/deals/deal-side-panel";
import { DealsStatsBar } from "@/features/crm/deals/deals-stats-bar";
import { DealForecastWidget } from "@/features/crm/deals/deal-forecast-widget";
import { DealsLoadingSkeleton } from "@/features/crm/deals/deals-loading-skeleton";
import { DealsCreateSheet } from "@/features/crm/deals/deals-create-sheet";
import { KanbanColumn } from "@/features/crm/deals/kanban-column";
import { WinLossDialog } from "@/features/crm/deals/win-loss-dialog";
import { StageSkipDialog } from "@/features/crm/deals/stage-skip-dialog";
import { useDealsExport } from "@/features/crm/deals/use-deals-export";
import { ImportLinkButton } from "@/features/crm/import/import-link-button";
import { ErrorState } from "@/components/shared/error-state";
import { useCan } from "@/hooks/api/access";

export default function DealsPage() {
  const canCreateDeal = useCan("crm:deals:create");
  const canUpdateDeal = useCan("crm:deals:update");
  const [density, setDensity] = useDensity();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const { staggerContainer, fadeUp } = useMotionVariants();

  const rawView = searchParams.get("view");
  const view: "table" | "kanban" = rawView === "kanban" ? "kanban" : "table";
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const debouncedSearchInput = useDebouncedValue(searchInput, 300);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (debouncedSearchInput === current) return;
    updateParams({ q: debouncedSearchInput || null });
  }, [debouncedSearchInput, searchParams, updateParams]);

  const { data: dealPipelines = [] } = useCrmPipelines("deal");
  const defaultPipeline = dealPipelines[0];
  const dealStages = useMemo(() => defaultPipeline?.stages ?? [], [defaultPipeline]);

  const kanbanStages = useMemo(
    () => dealStages.filter((s) => !s.isTerminal),
    [dealStages],
  );

  const stageFromUrl = searchParams.get("stage");
  const stageFilter = dealStages.find((s) => s.key === stageFromUrl)?.key;
  const assigneeFilter = searchParams.get("assignee");

  const dealFilters = useMemo<DealFilters | undefined>(() => {
    const filters: DealFilters = {};
    if (stageFilter) filters.stage = stageFilter as DealStage;
    if (assigneeFilter && assigneeFilter !== "all") filters.assignedToId = assigneeFilter;
    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [assigneeFilter, stageFilter]);

  const { data: allDeals, isLoading, isError, refetch, access } = useDeals(dealFilters);
  const { data: rawEmployees } = useHrEmployees();
  const employees = Array.isArray(rawEmployees) ? rawEmployees : (rawEmployees?.data ?? []);

  const handleExport = useDealsExport(allDeals);

  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } = useQueryParamOpen("create");
  const [dealToDelete, setDealToDelete] = useState<number | null>(null);
  const [sidePanelDealId, setSidePanelDealId] = useState<number | null>(null);
  const [winLossDialog, setWinLossDialog] = useState<{ id: number; stage: "WON" | "LOST" } | null>(null);
  const [winLossCategory, setWinLossCategory] = useState("");
  const [winLossNotes, setWinLossNotes] = useState("");
  const [stageSkipDialog, setStageSkipDialog] = useState<{
    id: number; from: string; to: string; skipped: string[];
  } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleConfettiDone = useCallback(() => setShowConfetti(false), []);
  const handleOpenCreate = useCallback(() => openCreate(), [openCreate]);
  const handleCreateOpenChange = useCallback((open: boolean) => setCreateOpen(open), [setCreateOpen]);
  const handleCreateSuccess = useCallback(() => setCreateOpen(false), [setCreateOpen]);
  const handleSidePanelClose = useCallback(() => setSidePanelDealId(null), []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  const handleStageFilterChange = useCallback((value: string) => {
    updateParams({ stage: value === "all" ? null : value });
  }, [updateParams]);

  const handleAssigneeFilterChange = useCallback((value: string) => {
    updateParams({ assignee: value === "all" ? null : value });
  }, [updateParams]);

  const handleViewTable = useCallback(() => updateParams({ view: null }), [updateParams]);
  const handleViewKanban = useCallback(() => updateParams({ view: "kanban" }), [updateParams]);

  const updateStageMutation = useUpdateDealStage();
  const deleteMutation = useDeleteDeal();

  const handleDeleteConfirm = useCallback(() => {
    if (dealToDelete) {
      deleteMutation.mutate(dealToDelete, {
        onSuccess: () => toast.success("Deal deleted"),
      });
    }
    setDealToDelete(null);
  }, [dealToDelete, deleteMutation]);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDealToDelete(null);
  }, []);

  const handleStageChange = useCallback(
    (id: number, stage: string) => {
      if (stage === "WON" || stage === "LOST") {
        setWinLossDialog({ id, stage: stage as "WON" | "LOST" });
        setWinLossCategory("");
        setWinLossNotes("");
        return;
      }
      const currentDeal = allDeals?.find((d) => d.id === id);
      const currentStage = currentDeal?.stage;
      const stageKeys = kanbanStages.map((s) => s.key);
      const fromIdx = stageKeys.indexOf(currentStage ?? "");
      const toIdx = stageKeys.indexOf(stage);
      if (fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx + 1) {
        const skipped = stageKeys.slice(fromIdx + 1, toIdx);
        setStageSkipDialog({ id, from: currentStage!, to: stage, skipped });
        return;
      }
      const version = currentDeal?.updatedAt
        ? new Date(currentDeal.updatedAt).toISOString()
        : undefined;
      updateStageMutation.mutate(
        { id, stage: stage as DealStage, version },
        {
          onSuccess: () => toast.success("Deal stage updated"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateStageMutation, allDeals, kanbanStages],
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { draggableId, destination } = result;
      if (!destination) return;
      const dealId = Number(draggableId);
      const currentDeal = allDeals?.find((d) => d.id === dealId);
      if (!currentDeal || currentDeal.stage === destination.droppableId) return;
      handleStageChange(dealId, destination.droppableId);
    },
    [allDeals, handleStageChange],
  );

  const handleWinLossConfirm = useCallback(() => {
    if (!winLossDialog) return;
    const reason = winLossNotes
      ? `${winLossCategory || "Other"}: ${winLossNotes}`
      : winLossCategory || undefined;
    updateStageMutation.mutate(
      { id: winLossDialog.id, stage: winLossDialog.stage, lostReason: reason },
      {
        onSuccess: () => {
          toast.success(`Deal marked as ${winLossDialog.stage}`);
          if (winLossDialog.stage === "WON") setShowConfetti(true);
          setWinLossDialog(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [winLossDialog, winLossCategory, winLossNotes, updateStageMutation]);

  const handleWinLossDialogChange = useCallback((open: boolean) => {
    if (!open) setWinLossDialog(null);
  }, []);
  const handleWinLossCancel = useCallback(() => setWinLossDialog(null), []);
  const handleStageSkipDialogClose = useCallback((open: boolean) => {
    if (!open) setStageSkipDialog(null);
  }, []);
  const handleCancelSkip = useCallback(() => setStageSkipDialog(null), []);

  const handleConfirmSkip = useCallback(() => {
    if (!stageSkipDialog) return;
    updateStageMutation.mutate(
      { id: stageSkipDialog.id, stage: stageSkipDialog.to as DealStage },
      {
        onSuccess: () => {
          toast.success("Deal stage updated");
          setStageSkipDialog(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [stageSkipDialog, updateStageMutation]);

  const filteredDeals = useMemo(() => {
    if (!allDeals) return [];
    const q = debouncedSearchInput.trim().toLowerCase();
    if (!q) return allDeals;
    return allDeals.filter((d) => d.name.toLowerCase().includes(q));
  }, [allDeals, debouncedSearchInput]);

  const dealsByStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const s of dealStages) map[s.key] = [];
    for (const d of filteredDeals) {
      if (map[d.stage]) map[d.stage].push(d);
    }
    return map;
  }, [filteredDeals, dealStages]);

  const assigneeOptions = useMemo(() => {
    if (!allDeals) return [];
    const seen = new Set<string>();
    const opts: { id: string; name: string }[] = [];
    for (const d of allDeals) {
      if (d.assignedToId && d.assignedTo?.name && !seen.has(d.assignedToId)) {
        seen.add(d.assignedToId);
        opts.push({ id: d.assignedToId, name: d.assignedTo.name });
      }
    }
    return opts;
  }, [allDeals]);

  const stats = useMemo(() => {
    if (!allDeals) return { total: 0, totalValue: 0, wonValue: 0, avgProbability: 0 };
    const active = allDeals.filter((d) => d.stage !== "LOST");
    return {
      total: allDeals.length,
      totalValue: active.reduce((s, d) => s + Number(d.value || 0), 0),
      wonValue: allDeals
        .filter((d) => d.stage === "WON")
        .reduce((s, d) => s + Number(d.value || 0), 0),
      avgProbability:
        active.length > 0
          ? Math.round(active.reduce((s, d) => s + (d.probability || 0), 0) / active.length)
          : 0,
    };
  }, [allDeals]);

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    const q = debouncedSearchInput.trim();
    if (q) labels.push(`search "${q}"`);
    if (stageFilter) {
      const stage = dealStages.find((s) => s.key === stageFilter);
      labels.push(`stage ${stage?.label ?? stageFilter}`);
    }
    if (assigneeFilter && assigneeFilter !== "all") {
      const owner = assigneeOptions.find((o) => o.id === assigneeFilter);
      labels.push(`owner ${owner?.name ?? assigneeFilter}`);
    }
    return labels;
  }, [debouncedSearchInput, stageFilter, assigneeFilter, dealStages, assigneeOptions]);

  const handleClearDealFilters = useCallback(() => {
    setSearchInput("");
    updateParams({ q: null, stage: null, assignee: null });
  }, [updateParams]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (view === "kanban" && isLoading) return <DealsLoadingSkeleton />;

  if (view === "kanban" && isError) {
    return (
      <PageWrapper title="Deals Pipeline" subtitle="Manage your deals">
        <ErrorState
          title="Failed to load deals"
          description="We couldn't load your deals. Please try again."
          onRetry={handleRetry}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  const subtitle = allDeals
    ? `${allDeals.length} deal${allDeals.length !== 1 ? "s" : ""}`
    : "Opportunities moving through your pipeline";

  const filterBar = (
    <DealsFilterBar
      search={searchInput}
      onSearchChange={handleSearchChange}
      stage={stageFromUrl ?? "all"}
      stages={dealStages}
      onStageChange={handleStageFilterChange}
      assignee={assigneeFilter ?? "all"}
      assigneeOptions={assigneeOptions}
      onAssigneeChange={handleAssigneeFilterChange}
      view={view}
      onViewTable={handleViewTable}
      onViewKanban={handleViewKanban}
      density={density}
      onDensityChange={setDensity}
      canExport={!!allDeals && allDeals.length > 0}
      onExport={handleExport}
    />
  );

  return (
    <>
      {showConfetti && <ConfettiOverlay onDone={handleConfettiDone} />}
      <PageWrapper
        title="Deals Pipeline"
        subtitle={subtitle}
        filters={filterBar}
        actions={
          <>
            {canCreateDeal ? <ImportLinkButton entity="deals" /> : null}
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Deal
            </Button>
            <DealsCreateSheet
              open={createOpen}
              onOpenChange={handleCreateOpenChange}
              employees={employees}
              onSuccess={handleCreateSuccess}
            />
          </>
        }
      >
        <motion.div
          className="flex flex-1 min-h-0 flex-col space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {allDeals ? (
            <>
              <motion.div variants={fadeUp} className="sticky top-0 z-10 shrink-0 border-b border-border bg-muted/40 pb-2 backdrop-blur-sm">
                <DealsStatsBar {...stats} />
              </motion.div>

              <motion.div variants={fadeUp} className="shrink-0">
                <DealForecastWidget deals={filteredDeals} />
              </motion.div>
            </>
          ) : null}

          {view === "table" && (
            <motion.div variants={fadeUp} className="flex flex-1 min-h-0 flex-col">
              <DealList
              access={access}
                deals={filteredDeals}
                isLoading={isLoading}
                isError={isError}
                density={density}
                canCreate={canCreateDeal}
                canUpdate={canUpdateDeal}
                activeFilterLabels={activeFilterLabels}
                onRetry={handleRetry}
                onClearFilters={handleClearDealFilters}
                onCreateDeal={handleOpenCreate}
                onStageChange={handleStageChange}
              />
            </motion.div>
          )}

          {view === "kanban" && (
            <motion.div variants={fadeUp} className="flex flex-1 min-h-0 flex-col">
              <DragDropContext onDragEnd={handleDragEnd}>
                <ScrollArea className="w-full flex-1 min-h-0" type="auto">
                  <div className="inline-flex gap-3 sm:gap-4 pb-4">
                    {kanbanStages.map((s) => (
                      <KanbanColumn
                        key={s.key}
                        stage={{ key: s.key, label: s.label, color: s.color }}
                        deals={dealsByStage[s.key] ?? []}
                        onStageChange={handleStageChange}
                        onDelete={setDealToDelete}
                        onOpen={setSidePanelDealId}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </DragDropContext>
            </motion.div>
          )}

          <ConfirmDialog
            open={dealToDelete !== null}
            onOpenChange={handleDeleteDialogChange}
            title="Delete deal?"
            description="This action cannot be undone."
            confirmLabel="Delete"
            destructive
            onConfirm={handleDeleteConfirm}
          />

          <WinLossDialog
            dialog={winLossDialog}
            category={winLossCategory}
            notes={winLossNotes}
            isPending={updateStageMutation.isPending}
            onOpenChange={handleWinLossDialogChange}
            onCategoryChange={setWinLossCategory}
            onNotesChange={setWinLossNotes}
            onConfirm={handleWinLossConfirm}
            onCancel={handleWinLossCancel}
          />

          <StageSkipDialog
            dialog={stageSkipDialog}
            isPending={updateStageMutation.isPending}
            onOpenChange={handleStageSkipDialogClose}
            onCancel={handleCancelSkip}
            onConfirm={handleConfirmSkip}
          />
        </motion.div>
      </PageWrapper>

      <DealSidePanel dealId={sidePanelDealId} onClose={handleSidePanelClose} />
    </>
  );
}
