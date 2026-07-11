"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useCan } from "@/hooks/api/access";
import { CompCycleList } from "@/features/hr/enterprise/comp/comp-cycle-list";
import { CompCycleDetail } from "@/features/hr/enterprise/comp/comp-cycle-detail";
import { useCreateCompCycle, type CompCycle } from "@/hooks/api/hr/enterprise-comp";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";

export default function CompensationPlanningPage() {
  const canManage = useCan("hr:compensation:manage");
  const [selectedCycle, setSelectedCycle] = useState<CompCycle | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const createMut = useCreateCompCycle();

  const [newCycleName, setNewCycleName] = useState("");
  const [newCycleFY, setNewCycleFY] = useState(new Date().getFullYear());
  const [newCycleBudget, setNewCycleBudget] = useState("");

  function handleCreate() {
    if (!newCycleName) return;
    createMut.mutate(
      { name: newCycleName, fiscalYear: Number(newCycleFY), budgetPoolCents: Math.round(parseFloat(newCycleBudget || "0") * 100) },
      {
        onSuccess: () => { toast.success("Compensation cycle created"); setCreateOpen(false); setNewCycleName(""); setNewCycleBudget(""); },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <PageWrapper
      title={selectedCycle ? selectedCycle.name : "Compensation Planning"}
      subtitle={selectedCycle ? `FY ${selectedCycle.fiscalYear} · ${selectedCycle.status}` : "Annual increment cycles, merit matrix, and budget pools"}
      actions={
        selectedCycle ? (
          <Button variant="outline" size="sm" onClick={() => setSelectedCycle(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            All Cycles
          </Button>
        ) : canManage ? (
          <Button onClick={() => setCreateOpen(true)} className="bg-blue-700 hover:bg-blue-800 text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Cycle
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
              <Label>Cycle Name</Label>
              <Input placeholder="Annual Merit 2026" value={newCycleName} onChange={(e) => setNewCycleName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fiscal Year</Label>
              <Input type="number" value={newCycleFY} onChange={(e) => setNewCycleFY(parseInt(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Budget Pool ($)</Label>
              <Input type="number" placeholder="500000" value={newCycleBudget} onChange={(e) => setNewCycleBudget(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <LoadingButton isPending={createMut.isPending} onClick={handleCreate} className="bg-blue-700 hover:bg-blue-800 text-white w-full">
              Create Cycle
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
