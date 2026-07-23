"use client";

import { useState, useMemo, useCallback, useTransition, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, Download, LayoutGrid, TableIcon } from "lucide-react";
import { ConfettiOverlay } from "@/components/celebration/confetti-overlay";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DealTableView } from "@/features/crm/deals/deal-table-view";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useDeals, useUpdateDealStage, useDeleteDeal, useCrmPipelines } from "@/hooks/api/crm";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import type { Deal, DealStage } from "@/types/crm";
import { useHrEmployees, unwrapEmployees } from "@/hooks/api/hr";
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
import { DealsCsvImportDialog } from "@/features/crm/deals/deals-csv-import-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";

export default function DealsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const shouldReduceMotion = useReducedMotion();

  const rawView = searchParams.get("view");
  const view: "table" | "kanban" = rawView === "kanban" ? "kanban" : "table";
  const dealSortCol = searchParams.get("sort") || "createdAt";
  const rawDir = searchParams.get("dir");
  const dealSortDir: "asc" | "desc" = rawDir === "asc" ? "asc" : "desc";

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
  const dealStages = defaultPipeline?.stages ?? [];

  const kanbanStages = useMemo(
    () => dealStages.filter((s) => !s.isTerminal),
    [dealStages],
  );

  const stageFromUrl = searchParams.get("stage");
  const stageFilter = dealStages.find((s) => s.key === stageFromUrl)?.key;

  const { data: allDeals, isLoading, isError, refetch } = useDeals(
    stageFilter ? { stage: stageFilter as DealStage } : undefined,
  );
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

  const handleDealSort = useCallback(
    (col: string) => {
      if (dealSortCol === col) {
        updateParams({ sort: col, dir: dealSortDir === "asc" ? "desc" : "asc" });
      } else {
        updateParams({ sort: col, dir: "desc" });
      }
    },
    [dealSortCol, dealSortDir, updateParams],
  );

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

  const assigneeFilter = searchParams.get("assignee");

  const filteredDeals = useMemo(() => {
    if (!allDeals) return [];
    const q = debouncedSearchInput.trim().toLowerCase();
    return allDeals.filter((d) => {
      if (q && !d.name.toLowerCase().includes(q)) return false;
      if (assigneeFilter && assigneeFilter !== "all" && d.assignedToId !== assigneeFilter) return false;
      return true;
    });
  }, [allDeals, debouncedSearchInput, assigneeFilter]);

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

  const containerVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : staggerContainer;
  const itemVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : fadeUp;

  if (isLoading) return <DealsLoadingSkeleton />;

  if (isError) {
    return (
      <PageWrapper title="Deals Pipeline" subtitle="Manage your deals">
        <ErrorState
          title="Failed to load deals"
          description="We couldn't load your deals. Please try again."
          onRetry={() => void refetch()}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  const subtitle = `${allDeals?.length ?? 0} deal${(allDeals?.length ?? 0) !== 1 ? "s" : ""}`;

  const filterBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <div className="w-[200px] max-w-[min(200px,70vw)]">
        <SearchInput value={searchInput} onValueChange={handleSearchChange} placeholder="Search deals..." aria-label="Search deals" />
      </div>
      <Select value={stageFromUrl ?? "all"} onValueChange={handleStageFilterChange}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[140px]")}>
          <SelectValue placeholder="All stages" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All stages</SelectItem>
          {dealStages.map((s) => (
            <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {assigneeOptions.length > 0 && (
        <Select value={assigneeFilter ?? "all"} onValueChange={handleAssigneeFilterChange}>
          <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[140px]")}>
            <SelectValue placeholder="All assignees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            {assigneeOptions.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="ml-auto flex items-center gap-px border border-border rounded-md shrink-0">
        <Button
          variant={view === "table" ? "secondary" : "ghost"}
          size="icon"
          className="h-9 w-9 rounded-r-none border-r border-border"
          onClick={handleViewTable}
          aria-label="Table view"
        >
          <TableIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={view === "kanban" ? "secondary" : "ghost"}
          size="icon"
          className="h-9 w-9 rounded-l-none"
          onClick={handleViewKanban}
          aria-label="Kanban view"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Button variant="outline" size="sm" className="text-xs shrink-0" onClick={handleExport}>
        <Download className="h-3.5 w-3.5 mr-1.5" />
        Export
      </Button>
    </div>
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
            <DealsCsvImportDialog />
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
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="sticky top-0 z-10 shrink-0 border-b border-border bg-muted/40 pb-2 backdrop-blur-sm">
            <DealsStatsBar {...stats} />
          </motion.div>

          <motion.div variants={itemVariants} className="shrink-0">
            <DealForecastWidget deals={filteredDeals} />
          </motion.div>

          {view === "table" && (
            <motion.div variants={itemVariants} className="flex flex-1 min-h-0 flex-col">
              <DealTableView
                deals={filteredDeals}
                sortColumn={dealSortCol}
                sortDirection={dealSortDir}
                onSort={handleDealSort}
                onStageChange={handleStageChange}
                isLoading={false}
              />
            </motion.div>
          )}

          {view === "kanban" && (
            <motion.div variants={itemVariants} className="flex flex-1 min-h-0 flex-col">
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
