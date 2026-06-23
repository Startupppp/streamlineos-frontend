"use client";

import { useState, useCallback } from "react";
import {
  useReviewCycles,
  useCreateReviewCycle,
  useUpdateReviewCycle,
  useDeleteReviewCycle,
} from "@/lib/api/hooks/hr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Plus, Calendar, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReviewCycle } from "@/types/hr";

export function CyclesTab() {
  const { data: cycles, isLoading } = useReviewCycles();
  const createCycle = useCreateReviewCycle();
  const updateCycle = useUpdateReviewCycle();
  const deleteCycle = useDeleteReviewCycle();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editCycle, setEditCycle] = useState<ReviewCycle | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("QUARTERLY");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [deadline, setDeadline] = useState("");

  const openCreate = useCallback(() => {
    setEditCycle(null);
    setName(""); setType("QUARTERLY"); setPeriodStart(""); setPeriodEnd(""); setDeadline("");
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((cycle: ReviewCycle) => {
    setEditCycle(cycle);
    setName(cycle.name ?? "");
    setType(cycle.type ?? "QUARTERLY");
    setPeriodStart(cycle.periodStart ?? "");
    setPeriodEnd(cycle.periodEnd ?? "");
    setDeadline(cycle.deadline ?? "");
    setSheetOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) { toast.error("Cycle name is required"); return; }
    if (trimmedName.length < 3) { toast.error("Cycle name must be at least 3 characters"); return; }
    if (trimmedName.length > 100) { toast.error("Cycle name must be at most 100 characters"); return; }
    if (!/[a-zA-Z0-9]/.test(trimmedName)) { toast.error("Cycle name must contain at least one letter or number"); return; }
    if (/\s{2,}/.test(trimmedName)) { toast.error("Cycle name cannot have consecutive spaces"); return; }
    if (!periodStart) { toast.error("Period start date is required"); return; }
    if (!editCycle) {
      const today = new Date().toISOString().slice(0, 10);
      if (periodStart < today) { toast.error("Period start date cannot be earlier than today"); return; }
    }
    if (!periodEnd) { toast.error("Period end date is required"); return; }
    if (periodEnd <= periodStart) { toast.error("Period end must be after period start"); return; }
    if (periodStart === periodEnd) { toast.error("Period start and end dates cannot be the same"); return; }
    if (!deadline) { toast.error("Submission deadline is required"); return; }
    if (deadline <= periodEnd) { toast.error("Submission deadline must be after period end"); return; }
    if (editCycle) {
      updateCycle.mutate(
        { id: editCycle.id, name: trimmedName, type, periodStart, periodEnd, deadline: deadline || undefined },
        {
          onSuccess: () => { toast.success("Cycle updated"); setSheetOpen(false); setEditCycle(null); },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    } else {
      createCycle.mutate(
        { name: trimmedName, type, periodStart, periodEnd, deadline: deadline || undefined },
        {
          onSuccess: () => {
            toast.success("Cycle created");
            setSheetOpen(false);
            setName(""); setPeriodStart(""); setPeriodEnd(""); setDeadline("");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    }
  }, [name, type, periodStart, periodEnd, deadline, editCycle, createCycle, updateCycle]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteCycle.mutate(deleteId, {
      onSuccess: () => { toast.success("Cycle deleted"); setDeleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, deleteCycle]);

  const handleDeleteDialogChange = useCallback((open: boolean) => { if (!open) setDeleteId(null); }, []);
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value), []);
  const handlePeriodStartChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setPeriodStart(e.target.value), []);
  const handlePeriodEndChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setPeriodEnd(e.target.value), []);
  const handleDeadlineChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDeadline(e.target.value), []);

  if (isLoading) {
    return <LoadingState variant="list" rows={3} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{cycles?.length ?? 0} cycles</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" />New Cycle
        </Button>
      </div>

      {!cycles?.length ? (
        <EmptyState icon={Calendar} title="No review cycles yet" description="Create a quarterly or annual cycle." compact />
      ) : (
        <div className="space-y-2">
          {cycles.map((cycle: ReviewCycle) => (
            <Card key={cycle.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{cycle.name}</p>
                    <Badge variant={cycle.status === "ACTIVE" ? "default" : cycle.status === "COMPLETED" ? "secondary" : "outline"} className="text-[10px]">{cycle.status}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {cycle.periodStart} → {cycle.periodEnd}
                    {cycle.deadline && <> &middot; Deadline: {cycle.deadline}</>}
                    {cycle.type && <> &middot; {cycle.type}</>}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(cycle)}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(cycle.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title={editCycle ? "Edit Review Cycle" : "Create Review Cycle"} onSubmit={handleCreate} submitLabel={editCycle ? "Save Changes" : "Create"} isPending={createCycle.isPending || updateCycle.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Cycle Name</label>
          <Input placeholder="e.g., Q2 2026 Review" value={name} onChange={handleNameChange} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Type</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              <SelectItem value="QUARTERLY">Quarterly — 3-month cycle</SelectItem>
              <SelectItem value="HALF_YEARLY">Half-Yearly — 6-month cycle</SelectItem>
              <SelectItem value="ANNUAL">Annual — Full-year cycle</SelectItem>
              <SelectItem value="CUSTOM">Custom — Define your own period</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            {type === "QUARTERLY" && "3-month performance review. Best for fast-paced teams that need frequent check-ins and course corrections."}
            {type === "HALF_YEARLY" && "6-month review cycle. Provides a balanced mid-year checkpoint for goal progress and development feedback."}
            {type === "ANNUAL" && "Comprehensive year-end evaluation covering overall performance, growth, and compensation decisions."}
            {type === "CUSTOM" && "Flexible review period tailored to your team's schedule. Define any start/end dates and deadline that fits your workflow."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Period Start</label>
            <Input type="date" value={periodStart} onChange={handlePeriodStartChange} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Period End</label>
            <Input type="date" value={periodEnd} min={periodStart || undefined} onChange={handlePeriodEndChange} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Submission Deadline</label>
          <Input type="date" value={deadline} min={periodEnd || undefined} onChange={handleDeadlineChange} />
        </div>
      </HrSheet>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogChange}
        title="Delete Review Cycle"
        description="Are you sure you want to delete this review cycle? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        isPending={deleteCycle.isPending}
      />
    </div>
  );
}
