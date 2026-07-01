"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Download, LayoutGrid, TableIcon, TrendingUp } from "lucide-react";
import { ConfettiOverlay } from "@/features/crm/deals/confetti-overlay";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DealTableView } from "@/features/crm/deals/deal-table-view";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useDeals, useUpdateDealStage, useDeleteDeal } from "@/hooks/api/crm";
import type { Deal } from "@/types/crm";
import { useHrEmployees } from "@/hooks/api/hr";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { DEAL_STAGES } from "@/features/crm/shared/constants";
import { DealSidePanel } from "@/features/crm/deals/deal-side-panel";
import { DealsStatsBar } from "@/features/crm/deals/deals-stats-bar";
import { DealForecastWidget } from "@/features/crm/deals/deal-forecast-widget";
import { DealsLoadingSkeleton } from "@/features/crm/deals/deals-loading-skeleton";
import { DealsCreateSheet } from "@/features/crm/deals/deals-create-sheet";
import { KanbanFilterBar } from "@/features/crm/deals/kanban-filter-bar";
import { KanbanColumn } from "@/features/crm/deals/kanban-column";
import { WinLossDialog } from "@/features/crm/deals/win-loss-dialog";
import { StageSkipDialog } from "@/features/crm/deals/stage-skip-dialog";
import { useDealsExport } from "@/features/crm/deals/use-deals-export";
import { DealsCsvImportDialog } from "@/features/crm/deals/deals-csv-import-dialog";

const STAGE_ORDER = ["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION"] as const;

export default function DealsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const rawView = searchParams.get("view");
  const view: "table" | "kanban" = rawView === "kanban" ? "kanban" : "table";
  const dealSortCol = searchParams.get("sort") || "createdAt";
  const rawDir = searchParams.get("dir");
  const dealSortDir: "asc" | "desc" = rawDir === "asc" ? "asc" : "desc";

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

  const { data: allDeals, isLoading } = useDeals();
  const { data: rawEmployees } = useHrEmployees();
  const employees = Array.isArray(rawEmployees)
    ? rawEmployees
    : (rawEmployees?.data ?? []);

  const handleExport = useDealsExport(allDeals);

  const [createOpen, setCreateOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<number | null>(null);
  const [sidePanelDealId, setSidePanelDealId] = useState<number | null>(null);
  const [winLossDialog, setWinLossDialog] = useState<{
    id: number;
    stage: "WON" | "LOST";
  } | null>(null);
  const [winLossCategory, setWinLossCategory] = useState("");
  const [winLossNotes, setWinLossNotes] = useState("");
  const [stageSkipDialog, setStageSkipDialog] = useState<{
    id: number;
    from: string;
    to: string;
    skipped: string[];
  } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleConfettiDone = useCallback(() => setShowConfetti(false), []);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCreateOpenChange = useCallback(
    (open: boolean) => setCreateOpen(open),
    [],
  );
  const handleCreateSuccess = useCallback(() => setCreateOpen(false), []);
  const handleSidePanelClose = useCallback(() => setSidePanelDealId(null), []);

  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterMinValue, setFilterMinValue] = useState("");
  const [filterMaxValue, setFilterMaxValue] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<{
    assignee: string;
    minValue: string;
    maxValue: string;
  }>({ assignee: "all", minValue: "", maxValue: "" });

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({
      assignee: filterAssignee,
      minValue: filterMinValue,
      maxValue: filterMaxValue,
    });
  }, [filterAssignee, filterMinValue, filterMaxValue]);

  const handleClearFilters = useCallback(() => {
    setFilterAssignee("all");
    setFilterMinValue("");
    setFilterMaxValue("");
    setAppliedFilters({ assignee: "all", minValue: "", maxValue: "" });
  }, []);

  const hasActiveFilters =
    appliedFilters.assignee !== "all" ||
    appliedFilters.minValue !== "" ||
    appliedFilters.maxValue !== "";

  const handleDealSort = useCallback(
    (col: string) => {
      if (dealSortCol === col) {
        updateParams({
          sort: col,
          dir: dealSortDir === "asc" ? "desc" : "asc",
        });
      } else {
        updateParams({ sort: col, dir: "desc" });
      }
    },
    [dealSortCol, dealSortDir, updateParams],
  );

  const handleViewTable = useCallback(
    () => updateParams({ view: null }),
    [updateParams],
  );
  const handleViewKanban = useCallback(
    () => updateParams({ view: "kanban" }),
    [updateParams],
  );

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
      const fromIdx = STAGE_ORDER.indexOf(
        currentStage as (typeof STAGE_ORDER)[number],
      );
      const toIdx = STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]);
      if (fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx + 1) {
        const skipped = STAGE_ORDER.slice(fromIdx + 1, toIdx);
        setStageSkipDialog({
          id,
          from: currentStage!,
          to: stage,
          skipped: [...skipped],
        });
        return;
      }
      const version = currentDeal?.updatedAt
        ? new Date(currentDeal.updatedAt).toISOString()
        : undefined;
      updateStageMutation.mutate(
        {
          id,
          stage: stage as "LEAD" | "CONTACTED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST",
          version,
        },
        {
          onSuccess: () => toast.success("Deal stage updated"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateStageMutation, allDeals],
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
      {
        id: stageSkipDialog.id,
        stage: stageSkipDialog.to as "LEAD" | "CONTACTED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST",
      },
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
    return allDeals.filter((d) => {
      if (
        appliedFilters.assignee !== "all" &&
        d.assignedToId !== appliedFilters.assignee
      )
        return false;
      if (appliedFilters.minValue !== "") {
        const min = Number(appliedFilters.minValue);
        if (!Number.isNaN(min) && Number(d.value ?? 0) < min) return false;
      }
      if (appliedFilters.maxValue !== "") {
        const max = Number(appliedFilters.maxValue);
        if (!Number.isNaN(max) && Number(d.value ?? 0) > max) return false;
      }
      return true;
    });
  }, [allDeals, appliedFilters]);

  const dealsByStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const s of DEAL_STAGES) map[s.key] = [];
    for (const d of filteredDeals) {
      if (map[d.stage]) map[d.stage].push(d);
    }
    return map;
  }, [filteredDeals]);

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
    if (!allDeals)
      return { total: 0, totalValue: 0, wonValue: 0, avgProbability: 0 };
    const active = allDeals.filter((d) => d.stage !== "LOST");
    return {
      total: allDeals.length,
      totalValue: active.reduce((s, d) => s + Number(d.value || 0), 0),
      wonValue: allDeals
        .filter((d) => d.stage === "WON")
        .reduce((s, d) => s + Number(d.value || 0), 0),
      avgProbability:
        active.length > 0
          ? Math.round(
              active.reduce((s, d) => s + (d.probability || 0), 0) /
                active.length,
            )
          : 0,
    };
  }, [allDeals]);

  if (isLoading) return <DealsLoadingSkeleton />;

  return (
    <>
      {showConfetti && <ConfettiOverlay onDone={handleConfettiDone} />}
      <PageWrapper
        title="Deals Pipeline"
        subtitle="Track and manage your deals across stages"
        actions={
          <>
            <div className="flex items-center border border-border rounded-md">
              <Button
                variant={view === "table" ? "default" : "ghost"}
                size="sm"
                className="rounded-r-none"
                onClick={handleViewTable}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "kanban" ? "default" : "ghost"}
                size="sm"
                className="rounded-l-none"
                onClick={handleViewKanban}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/crm/deals/forecast">
                <TrendingUp className="h-4 w-4 mr-1.5" />
                Forecast
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <DealsCsvImportDialog />
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
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
          className="space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={fadeUp}
            className="sticky top-0 z-10 bg-background pb-2"
          >
            <DealsStatsBar {...stats} />
          </motion.div>

          <motion.div variants={fadeUp}>
            <DealForecastWidget deals={filteredDeals} />
          </motion.div>

          {view === "table" && (
            <motion.div variants={fadeUp}>
              <DealTableView
                deals={allDeals || []}
                sortColumn={dealSortCol}
                sortDirection={dealSortDir}
                onSort={handleDealSort}
                onStageChange={handleStageChange}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {view === "kanban" && (
            <motion.div variants={fadeUp} className="space-y-3">
              <KanbanFilterBar
                assigneeOptions={assigneeOptions}
                filterAssignee={filterAssignee}
                filterMinValue={filterMinValue}
                filterMaxValue={filterMaxValue}
                hasActiveFilters={hasActiveFilters}
                onAssigneeChange={setFilterAssignee}
                onMinValueChange={setFilterMinValue}
                onMaxValueChange={setFilterMaxValue}
                onApply={handleApplyFilters}
                onClear={handleClearFilters}
              />
              <DragDropContext onDragEnd={handleDragEnd}>
                <ScrollArea className="w-full" type="auto">
                  <div className="inline-flex gap-3 sm:gap-4 pb-4">
                    {DEAL_STAGES.map((stage) => (
                      <KanbanColumn
                        key={stage.key}
                        stage={stage}
                        deals={dealsByStage[stage.key] || []}
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
