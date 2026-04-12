"use client";

import { useState, useMemo, useCallback, useTransition, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Download, LayoutGrid, TableIcon, Filter, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DealTableView } from "@/features/crm/deals/deal-table-view";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { formatINRCompact } from "@/lib/format-utils";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { useDeals, useUpdateDealStage, useDeleteDeal } from "@/lib/api/hooks/crm";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { toast } from "sonner";
import { DEAL_STAGES } from "@/features/crm/shared/constants";
import { CreateDealForm } from "@/features/crm/deals/create-deal-form";
import { DealKanbanCard } from "@/features/crm/deals/deal-kanban-card";
import { DealSidePanel } from "@/features/crm/deals/deal-side-panel";
import { DealsStatsBar } from "@/features/crm/deals/deals-stats-bar";
import { DealForecastWidget } from "@/features/crm/deals/deal-forecast-widget";

const CONFETTI_COLORS = ["#bd882c", "#0f2b7f", "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#8B5CF6"];

function ConfettiOverlay({ onDone }: { onDone: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    timerRef.current = setTimeout(onDone, 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [onDone]);

  const dots = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 1.5}s`,
      size: `${6 + Math.random() * 8}px`,
      duration: `${1.5 + Math.random() * 1.5}s`,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  , []);

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .confetti-dot {
          position: fixed;
          top: 0;
          border-radius: 2px;
          pointer-events: none;
          animation: confetti-fall linear forwards;
          z-index: 9999;
        }
      `}</style>
      {dots.map(d => (
        <span
          key={d.id}
          className="confetti-dot"
          style={{
            left: d.left,
            width: d.size,
            height: d.size,
            backgroundColor: d.color,
            animationDuration: d.duration,
            animationDelay: d.delay,
          }}
        />
      ))}
    </>
  );
}

export default function DealsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const view = (searchParams.get("view") || "table") as "table" | "kanban";
  const dealSortCol = searchParams.get("sort") || "createdAt";
  const dealSortDir = (searchParams.get("dir") || "desc") as "asc" | "desc";

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
  const employees = Array.isArray(rawEmployees) ? rawEmployees : rawEmployees?.data ?? [];
  const [createOpen, setCreateOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<number | null>(null);
  const [sidePanelDealId, setSidePanelDealId] = useState<number | null>(null);
  const [winLossDialog, setWinLossDialog] = useState<{ id: number; stage: "WON" | "LOST" } | null>(null);
  const [winLossCategory, setWinLossCategory] = useState("");
  const [winLossNotes, setWinLossNotes] = useState("");
  const [stageSkipDialog, setStageSkipDialog] = useState<{ id: number; from: string; to: string; skipped: string[] } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const handleConfettiDone = useCallback(() => setShowConfetti(false), []);

  // Filter state
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterMinValue, setFilterMinValue] = useState("");
  const [filterMaxValue, setFilterMaxValue] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<{
    assignee: string; minValue: string; maxValue: string;
  }>({ assignee: "all", minValue: "", maxValue: "" });

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({ assignee: filterAssignee, minValue: filterMinValue, maxValue: filterMaxValue });
  }, [filterAssignee, filterMinValue, filterMaxValue]);

  const handleClearFilters = useCallback(() => {
    setFilterAssignee("all");
    setFilterMinValue("");
    setFilterMaxValue("");
    setAppliedFilters({ assignee: "all", minValue: "", maxValue: "" });
  }, []);

  const hasActiveFilters = appliedFilters.assignee !== "all" || appliedFilters.minValue !== "" || appliedFilters.maxValue !== "";

  const handleDealSort = useCallback((col: string) => {
    if (dealSortCol === col) {
      updateParams({ sort: col, dir: dealSortDir === "asc" ? "desc" : "asc" });
    } else {
      updateParams({ sort: col, dir: "desc" });
    }
  }, [dealSortCol, dealSortDir, updateParams]);

  const handleViewTable = useCallback(() => updateParams({ view: null }), [updateParams]);
  const handleViewKanban = useCallback(() => updateParams({ view: "kanban" }), [updateParams]);
  const handleCreateSuccess = useCallback(() => setCreateOpen(false), []);

  const handleExport = useCallback(async () => {
    try {
      const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
      const rows = (allDeals || []).map(d => ({
        name: d.name,
        value: d.value || "0",
        stage: d.stage,
        probability: `${d.probability ?? 0}%`,
        contactPerson: d.contactPerson || "",
        contactEmail: d.contactEmail || "",
        assignedTo: d.assignedTo?.name || "Unassigned",
        expectedClose: d.expectedCloseDate || "",
        createdAt: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "",
      }));
      await downloadXlsx("deals-export.xlsx", [{
        name: "Deals",
        columns: [
          { header: "Deal Name", key: "name", width: 25 },
          { header: "Value (INR)", key: "value", width: 15 },
          { header: "Stage", key: "stage", width: 14 },
          { header: "Probability", key: "probability", width: 12 },
          { header: "Contact Person", key: "contactPerson", width: 20 },
          { header: "Contact Email", key: "contactEmail", width: 25 },
          { header: "Assigned To", key: "assignedTo", width: 18 },
          { header: "Expected Close", key: "expectedClose", width: 14 },
          { header: "Created", key: "createdAt", width: 12 },
        ],
        rows,
      }]);
      toast.success("Deals exported");
    } catch { toast.error("Export failed"); }
  }, [allDeals]);

  const updateStageMutation = useUpdateDealStage();
  const deleteMutation = useDeleteDeal();

  const handleDeleteConfirm = useCallback(() => {
    if (dealToDelete) {
      deleteMutation.mutate(dealToDelete, { onSuccess: () => toast.success("Deal deleted") });
    }
    setDealToDelete(null);
  }, [dealToDelete, deleteMutation]);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDealToDelete(null);
  }, []);

  const STAGE_ORDER = ["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION"] as const;

  const handleStageChange = useCallback((id: number, stage: string) => {
    if (stage === "WON" || stage === "LOST") {
      setWinLossDialog({ id, stage: stage as "WON" | "LOST" });
      setWinLossCategory("");
      setWinLossNotes("");
      return;
    }
    // Stage skip validation: detect if moving forward more than 1 stage
    const currentDeal = allDeals?.find((d) => d.id === id);
    const currentStage = currentDeal?.stage;
    const fromIdx = STAGE_ORDER.indexOf(currentStage as typeof STAGE_ORDER[number]);
    const toIdx = STAGE_ORDER.indexOf(stage as typeof STAGE_ORDER[number]);
    if (fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx + 1) {
      const skipped = STAGE_ORDER.slice(fromIdx + 1, toIdx);
      setStageSkipDialog({ id, from: currentStage!, to: stage, skipped: [...skipped] });
      return;
    }
    const version = currentDeal?.updatedAt ? new Date(currentDeal.updatedAt).toISOString() : undefined;
    updateStageMutation.mutate(
      { id, stage: stage as "LEAD" | "CONTACTED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST", version },
      {
        onSuccess: () => toast.success("Deal stage updated"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update stage"),
      },
    );
  }, [updateStageMutation, allDeals]);

  const handleDragEnd = useCallback((result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    const newStage = destination.droppableId;
    const dealId = Number(draggableId);
    const currentDeal = allDeals?.find((d) => d.id === dealId);
    if (!currentDeal || currentDeal.stage === newStage) return;
    handleStageChange(dealId, newStage);
  }, [allDeals, handleStageChange]);

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
      },
    );
  }, [winLossDialog, winLossCategory, winLossNotes, updateStageMutation]);

  const handleWinLossDialogChange = useCallback((open: boolean) => {
    if (!open) setWinLossDialog(null);
  }, []);

  const filteredDeals = useMemo(() => {
    if (!allDeals) return [];
    return allDeals.filter(d => {
      if (appliedFilters.assignee !== "all" && d.assignedToId !== appliedFilters.assignee) return false;
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
    const map: Record<string, typeof allDeals> = {};
    for (const s of DEAL_STAGES) map[s.key] = [];
    filteredDeals.forEach(d => {
      if (map[d.stage]) map[d.stage]!.push(d);
    });
    return map;
  }, [filteredDeals]);

  // Unique assignees from all deals for filter dropdown
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
    const active = allDeals.filter(d => d.stage !== "LOST");
    return {
      total: allDeals.length,
      totalValue: active.reduce((s, d) => s + Number(d.value || 0), 0),
      wonValue: allDeals.filter(d => d.stage === "WON").reduce((s, d) => s + Number(d.value || 0), 0),
      avgProbability: active.length > 0
        ? Math.round(active.reduce((s, d) => s + (d.probability || 0), 0) / active.length)
        : 0,
    };
  }, [allDeals]);

  if (isLoading) {
    return (
      <PageWrapper title="Deals Pipeline" subtitle="Track and manage your deals across stages">
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <>
    {showConfetti && <ConfettiOverlay onDone={handleConfettiDone} />}
    <PageWrapper
      title="Deals Pipeline"
      subtitle="Track and manage your deals across stages"
      actions={
        <>
          <div className="flex items-center border border-border rounded-md">
            <Button variant={view === "table" ? "default" : "ghost"} size="sm"
              className={cn("rounded-r-none", view === "table" && "bg-gold hover:bg-gold/90 text-white")}
              onClick={handleViewTable}>
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button variant={view === "kanban" ? "default" : "ghost"} size="sm"
              className={cn("rounded-l-none", view === "kanban" && "bg-gold hover:bg-gold/90 text-white")}
              onClick={handleViewKanban}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />Export
          </Button>
          <Button className="bg-gold hover:bg-gold/90 text-white" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />New Deal
          </Button>
          <Sheet open={createOpen} onOpenChange={setCreateOpen}>
            <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
              <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                <SheetTitle>Create New Deal</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <CreateDealForm employees={employees} onSuccess={handleCreateSuccess} />
              </div>
            </SheetContent>
          </Sheet>
        </>
      }
    >
      <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={fadeUp} className="sticky top-0 z-10 bg-background pb-2">
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
            {/* Filters bar */}
            <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg border border-border/50 bg-muted/20">
              <Filter className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Assignee</label>
                <select
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  aria-label="Filter by assignee"
                >
                  <option value="all">All assignees</option>
                  {assigneeOptions.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Min value (₹)</label>
                <Input
                  value={filterMinValue}
                  onChange={(e) => setFilterMinValue(e.target.value)}
                  placeholder="0"
                  className="h-8 w-28 text-xs"
                  type="number"
                  min={0}
                  aria-label="Minimum deal value"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Max value (₹)</label>
                <Input
                  value={filterMaxValue}
                  onChange={(e) => setFilterMaxValue(e.target.value)}
                  placeholder="Any"
                  className="h-8 w-28 text-xs"
                  type="number"
                  min={0}
                  aria-label="Maximum deal value"
                />
              </div>
              <Button size="sm" className="h-8 bg-gold hover:bg-gold/90 text-white" onClick={handleApplyFilters}>
                Apply
              </Button>
              {hasActiveFilters && (
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={handleClearFilters}>
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <DragDropContext onDragEnd={handleDragEnd}>
              <ScrollArea className="w-full" type="auto">
                <div className="inline-flex gap-3 sm:gap-4 pb-4">
                  {DEAL_STAGES.map(stage => {
                    const stageDeals = dealsByStage[stage.key] || [];
                    const stageValue = stageDeals.reduce((s, d) => s + Number(d.value || 0), 0);
                    return (
                      <div key={stage.key} className="w-56 sm:w-64 md:w-72 flex-shrink-0">
                        <div className="mb-3 px-1">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2.5 h-2.5 rounded-full", stage.dot)} />
                            <span className="text-sm font-semibold">{stage.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 pl-[18px]">
                            {stageDeals.length} {stageDeals.length === 1 ? "deal" : "deals"}
                            {stageValue > 0 && (
                              <> · ₹{stageValue.toLocaleString("en-IN")}</>
                            )}
                          </p>
                        </div>
                        <Droppable droppableId={stage.key}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={cn(
                                "space-y-2 min-h-[200px] p-2 rounded-lg border border-border/50 transition-colors",
                                snapshot.isDraggingOver ? "bg-muted/60 border-gold/40" : "bg-muted/30"
                              )}
                            >
                              {stageDeals.map((deal, index) => (
                                <Draggable key={deal.id} draggableId={String(deal.id)} index={index}>
                                  {(dragProvided, dragSnapshot) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      className={cn(dragSnapshot.isDragging && "opacity-80 shadow-lg")}
                                    >
                                      <DealKanbanCard
                                        deal={deal}
                                        onStageChange={handleStageChange}
                                        onDelete={setDealToDelete}
                                        onOpen={setSidePanelDealId}
                                      />
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              {stageDeals.length === 0 && !snapshot.isDraggingOver && (
                                <div className="text-center py-8 text-xs text-muted-foreground">No deals</div>
                              )}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    );
                  })}
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

        <Dialog open={winLossDialog !== null} onOpenChange={handleWinLossDialogChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {winLossDialog?.stage === "WON" ? "Mark Deal as Won" : "Mark Deal as Lost"}
              </DialogTitle>
              <DialogDescription>
                {winLossDialog?.stage === "WON"
                  ? "Optionally record why this deal was won."
                  : "Optionally record why this deal was lost."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="winloss-category">
                  {winLossDialog?.stage === "WON" ? "Win reason" : "Loss reason"}
                </Label>
                <Select value={winLossCategory} onValueChange={setWinLossCategory}>
                  <SelectTrigger id="winloss-category">
                    <SelectValue placeholder="Select a reason (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {winLossDialog?.stage === "WON" ? (
                      <>
                        <SelectItem value="Best Product">Best Product</SelectItem>
                        <SelectItem value="Best Price">Best Price</SelectItem>
                        <SelectItem value="Best Support">Best Support</SelectItem>
                        <SelectItem value="Existing Relationship">Existing Relationship</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="Price Too High">Price Too High</SelectItem>
                        <SelectItem value="Chose Competitor">Chose Competitor</SelectItem>
                        <SelectItem value="No Budget">No Budget</SelectItem>
                        <SelectItem value="Poor Timing">Poor Timing</SelectItem>
                        <SelectItem value="Product Mismatch">Product Mismatch</SelectItem>
                        <SelectItem value="No Response">No Response</SelectItem>
                        <SelectItem value="Internal Decision">Internal Decision</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="winloss-notes">
                  {winLossDialog?.stage === "WON"
                    ? "What was the deciding factor?"
                    : "Why was the deal lost?"}
                  <span className="ml-1 text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Textarea
                  id="winloss-notes"
                  placeholder="Add any additional notes..."
                  rows={3}
                  value={winLossNotes}
                  onChange={e => setWinLossNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="flex-row gap-2 border-t pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setWinLossDialog(null)}>
                Cancel
              </Button>
              <Button
                className={cn(
                  "flex-1",
                  winLossDialog?.stage === "WON"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-destructive hover:bg-destructive/90 text-white",
                )}
                onClick={handleWinLossConfirm}
                disabled={updateStageMutation.isPending}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stage skip warning dialog */}
        <Dialog open={stageSkipDialog !== null} onOpenChange={(open) => { if (!open) setStageSkipDialog(null); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Skip stages?</DialogTitle>
              <DialogDescription>
                You are moving this deal from <strong>{stageSkipDialog?.from}</strong> to <strong>{stageSkipDialog?.to}</strong>, skipping:{" "}
                <strong>{stageSkipDialog?.skipped.join(", ")}</strong>.
                Are you sure you want to skip these stages?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-row gap-2 border-t pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setStageSkipDialog(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-gold hover:bg-gold/90 text-white"
                disabled={updateStageMutation.isPending}
                onClick={() => {
                  if (!stageSkipDialog) return;
                  updateStageMutation.mutate(
                    { id: stageSkipDialog.id, stage: stageSkipDialog.to as "LEAD" | "CONTACTED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" },
                    { onSuccess: () => { toast.success("Deal stage updated"); setStageSkipDialog(null); } },
                  );
                }}
              >
                Confirm Skip
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </PageWrapper>

    {/* Deal side-panel */}
    <DealSidePanel
      dealId={sidePanelDealId}
      onClose={() => setSidePanelDealId(null)}
    />
    </>
  );
}
