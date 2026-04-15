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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { toast } from "sonner";
import { Plus, Calendar, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/get-error-message";
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
    setName("");
    setType("QUARTERLY");
    setPeriodStart("");
    setPeriodEnd("");
    setDeadline("");
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

  const handleSubmit = useCallback(() => {
    if (!name || !periodStart || !periodEnd) {
      toast.error("Name and period are required");
      return;
    }
    if (editCycle) {
      updateCycle.mutate(
        { id: editCycle.id, name, type, periodStart, periodEnd, deadline: deadline || undefined },
        {
          onSuccess: () => {
            toast.success("Cycle updated");
            setSheetOpen(false);
            setEditCycle(null);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    } else {
      createCycle.mutate(
        { name, type, periodStart, periodEnd, deadline: deadline || undefined },
        {
          onSuccess: () => {
            toast.success("Cycle created");
            setSheetOpen(false);
            setName("");
            setPeriodStart("");
            setPeriodEnd("");
            setDeadline("");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    }
  }, [name, type, periodStart, periodEnd, deadline, editCycle, createCycle, updateCycle]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteCycle.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Cycle deleted");
        setDeleteId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, deleteCycle]);

  const handleDeleteDialogChange = useCallback(
    (open: boolean) => { if (!open) setDeleteId(null); },
    []
  );
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
    []
  );
  const handlePeriodStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setPeriodStart(e.target.value),
    []
  );
  const handlePeriodEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setPeriodEnd(e.target.value),
    []
  );
  const handleDeadlineChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDeadline(e.target.value),
    []
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
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
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No review cycles yet. Create a quarterly or annual cycle.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {cycles.map((cycle: ReviewCycle) => (
            <CycleCard
              key={cycle.id}
              cycle={cycle}
              onEdit={openEdit}
              onDeleteRequest={setDeleteId}
            />
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editCycle ? "Edit Review Cycle" : "Create Review Cycle"}
        onSubmit={handleSubmit}
        submitLabel={editCycle ? "Save Changes" : "Create"}
        isPending={createCycle.isPending || updateCycle.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Cycle Name</label>
          <Input
            placeholder="e.g., Q2 2026 Review"
            value={name}
            onChange={handleNameChange}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Type</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="QUARTERLY">Quarterly</SelectItem>
              <SelectItem value="HALF_YEARLY">Half-Yearly</SelectItem>
              <SelectItem value="ANNUAL">Annual</SelectItem>
              <SelectItem value="CUSTOM">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Period Start</label>
            <Input type="date" value={periodStart} onChange={handlePeriodStartChange} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Period End</label>
            <Input type="date" value={periodEnd} onChange={handlePeriodEndChange} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Submission Deadline</label>
          <Input type="date" value={deadline} onChange={handleDeadlineChange} />
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogChange}
        title="Delete Review Cycle"
        description="Are you sure you want to delete this review cycle? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteCycle.isPending}
      />
    </div>
  );
}

interface CycleCardProps {
  cycle: ReviewCycle;
  onEdit: (cycle: ReviewCycle) => void;
  onDeleteRequest: (id: number) => void;
}

function CycleCard({ cycle, onEdit, onDeleteRequest }: CycleCardProps) {
  const handleEdit = useCallback(() => onEdit(cycle), [onEdit, cycle]);
  const handleDeleteRequest = useCallback(
    () => onDeleteRequest(cycle.id),
    [onDeleteRequest, cycle.id]
  );

  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{cycle.name}</p>
            <Badge
              variant={
                cycle.status === "ACTIVE"
                  ? "default"
                  : cycle.status === "COMPLETED"
                    ? "secondary"
                    : "outline"
              }
              className="text-[10px]"
            >
              {cycle.status}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {cycle.periodStart} → {cycle.periodEnd}
            {cycle.deadline && <> &middot; Deadline: {cycle.deadline}</>}
            {cycle.type && <> &middot; {cycle.type}</>}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={handleDeleteRequest}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}
