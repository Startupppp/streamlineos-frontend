"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useCan } from "@/hooks/api/access";
import { CompCycleList } from "./comp-cycle-list";
import { CompCycleDetail } from "./comp-cycle-detail";
import { useCreateCompCycle, type CompCycle } from "@/hooks/api/hr/enterprise-comp";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { useOrgDisplay } from "@/hooks/api/org-display";

export function CompensationPlanningPage() {
  const canManage = useCan("hr:compensation:manage");
  const money = useOrgDisplay();
  const [selectedCycle, setSelectedCycle] = useState<CompCycle | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const createMut = useCreateCompCycle();

  const [newCycleName, setNewCycleName] = useState("");
  const [newCycleFY, setNewCycleFY] = useState(new Date().getFullYear());
  const [newCycleBudget, setNewCycleBudget] = useState("");

  const handleCreate = useCallback(() => {
    if (!newCycleName) return;
    createMut.mutate(
      {
        name: newCycleName,
        fiscalYear: Number(newCycleFY),
        budgetPoolCents: Math.round(parseFloat(newCycleBudget || "0") * 100),
      },
      {
        onSuccess: () => {
          toast.success("Compensation cycle created");
          setCreateOpen(false);
          setNewCycleName("");
          setNewCycleBudget("");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [newCycleName, newCycleFY, newCycleBudget, createMut]);

  const handleBackToCycles = useCallback(() => {
    setSelectedCycle(null);
  }, []);

  const handleCycleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCycleName(e.target.value);
  }, []);

  const handleCycleFYChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCycleFY(parseInt(e.target.value));
  }, []);

  const handleCycleBudgetChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCycleBudget(e.target.value);
  }, []);

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);

  return (
    <PageWrapper
      title={selectedCycle ? selectedCycle.name : "Compensation Planning"}
      subtitle={
        selectedCycle
          ? `FY ${selectedCycle.fiscalYear} · ${selectedCycle.status}`
          : "Annual increment cycles, merit matrix, and budget pools"
      }
      onBack={selectedCycle ? handleBackToCycles : undefined}
      backLabel="All Cycles"
      actions={
        !selectedCycle && canManage ? (
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create compensation cycle
          </Button>
        ) : undefined
      }
    >
      <motion.div
        key={selectedCycle?.id ?? "list"}
        initial={{ opacity: 0, x: selectedCycle ? 24 : -24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {selectedCycle ? (
          <CompCycleDetail cycleId={selectedCycle.id} canManage={canManage} />
        ) : (
          <CompCycleList onSelect={setSelectedCycle} />
        )}
      </motion.div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Compensation Cycle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="comp-cycle-name">Cycle name</Label>
              <Input
                id="comp-cycle-name"
                placeholder="Annual Merit 2026"
                value={newCycleName}
                onChange={handleCycleNameChange}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comp-cycle-fy">Fiscal year</Label>
              <Input
                id="comp-cycle-fy"
                type="number"
                value={newCycleFY}
                onChange={handleCycleFYChange}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comp-cycle-budget">Budget pool ({money.currency})</Label>
              <Input
                id="comp-cycle-budget"
                type="number"
                placeholder="500000"
                value={newCycleBudget}
                onChange={handleCycleBudgetChange}
              />
            </div>
          </div>
          <DialogFooter>
            <LoadingButton
              isPending={createMut.isPending}
              disabled={!newCycleName.trim()}
              onClick={handleCreate}
              className="w-full"
            >
              Create cycle
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
