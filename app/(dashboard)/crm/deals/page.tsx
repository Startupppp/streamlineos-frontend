"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Download, LayoutGrid, TableIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DealTableView } from "@/features/crm/deals/deal-table-view";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { formatINRCompact } from "@/lib/format-utils";
import { useDeals, useUpdateDealStage, useDeleteDeal } from "@/lib/api/hooks/crm";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { toast } from "sonner";
import { DEAL_STAGES } from "@/features/crm/shared/constants";
import { CreateDealForm } from "@/features/crm/deals/create-deal-form";
import { DealKanbanCard } from "@/features/crm/deals/deal-kanban-card";
import { DealsStatsBar } from "@/features/crm/deals/deals-stats-bar";

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

  const handleStageChange = useCallback((id: number, stage: string) => {
    updateStageMutation.mutate(
      { id, stage: stage as "LEAD" | "CONTACTED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" },
      { onSuccess: () => toast.success("Deal stage updated") },
    );
  }, [updateStageMutation]);

  const dealsByStage = useMemo(() => {
    const map: Record<string, typeof allDeals> = {};
    for (const s of DEAL_STAGES) map[s.key] = [];
    allDeals?.forEach(d => {
      if (map[d.stage]) map[d.stage]!.push(d);
    });
    return map;
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
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gold hover:bg-gold/90 text-white">
                <Plus className="h-4 w-4 mr-2" />New Deal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Deal</DialogTitle>
              </DialogHeader>
              <CreateDealForm employees={employees} onSuccess={handleCreateSuccess} />
            </DialogContent>
          </Dialog>
        </>
      }
    >
      <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={fadeUp}>
          <DealsStatsBar {...stats} />
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
          <motion.div variants={fadeUp}>
            <ScrollArea className="w-full" type="auto">
              <div className="inline-flex gap-3 sm:gap-4 pb-4">
                {DEAL_STAGES.map(stage => {
                  const stageDeals = dealsByStage[stage.key] || [];
                  const stageValue = stageDeals.reduce((s, d) => s + Number(d.value || 0), 0);
                  return (
                    <div key={stage.key} className="w-56 sm:w-64 md:w-72 flex-shrink-0">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2.5 h-2.5 rounded-full", stage.dot)} />
                          <span className="text-sm font-semibold">{stage.label}</span>
                          <Badge variant="secondary" className="text-xs">{stageDeals.length}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatINRCompact(stageValue)}</span>
                      </div>
                      <div className="space-y-2 min-h-[200px] p-2 rounded-lg bg-muted/30 border border-border/50">
                        {stageDeals.map(deal => (
                          <DealKanbanCard
                            key={deal.id}
                            deal={deal}
                            onStageChange={handleStageChange}
                            onDelete={setDealToDelete}
                          />
                        ))}
                        {stageDeals.length === 0 && (
                          <div className="text-center py-8 text-xs text-muted-foreground">No deals</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
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
      </motion.div>
    </PageWrapper>
  );
}
