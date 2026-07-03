"use client";

import { use, useState, useCallback, type ChangeEvent } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Diamond, Trash2, Pencil, CalendarCheck2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import {
  useProjectMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  type ProjectMilestone,
} from "@/hooks/api/projects";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, differenceInDays } from "date-fns";

const STATUS_CONFIG = {
  PENDING: { label: "Pending", variant: "secondary" as const, color: "text-muted-foreground" },
  ACHIEVED: { label: "Achieved", variant: "default" as const, color: "text-green-600" },
  MISSED: { label: "Missed", variant: "destructive" as const, color: "text-red-600" },
} as const;

function MilestoneDialog({
  projectId,
  milestone,
  onClose,
}: {
  projectId: number;
  milestone?: ProjectMilestone;
  onClose: () => void;
}) {
  const isEdit = !!milestone;
  const [name, setName] = useState(milestone?.name ?? "");
  const [description, setDescription] = useState(milestone?.description ?? "");
  const [targetDate, setTargetDate] = useState(milestone?.targetDate ?? "");
  const [status, setStatus] = useState<ProjectMilestone["status"]>(milestone?.status ?? "PENDING");

  const create = useCreateMilestone(projectId);
  const update = useUpdateMilestone(projectId);
  const isPending = create.isPending || update.isPending;

  const handleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, []);

  const handleDescriptionChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  }, []);

  const handleTargetDateChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setTargetDate(e.target.value);
  }, []);

  const handleStatusChange = useCallback((v: string) => {
    if (v === "PENDING" || v === "ACHIEVED" || v === "MISSED") {
      setStatus(v);
    }
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim() || !targetDate) return;
    if (isEdit) {
      update.mutate(
        { id: milestone.id, name: name.trim(), description: description.trim() || undefined, targetDate, status },
        { onSuccess: () => { toast.success("Milestone updated"); onClose(); }, onError: () => toast.error("Failed to update") },
      );
    } else {
      create.mutate(
        { name: name.trim(), description: description.trim() || undefined, targetDate, status },
        { onSuccess: () => { toast.success("Milestone created"); onClose(); }, onError: () => toast.error("Failed to create") },
      );
    }
  }, [name, targetDate, isEdit, milestone, description, status, update, create, onClose]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Milestone" : "New Milestone"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input placeholder="e.g. MVP Launch" value={name} onChange={handleNameChange} />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={handleDescriptionChange} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Target Date *</Label>
              <Input type="date" value={targetDate} onChange={handleTargetDateChange} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ACHIEVED">Achieved</SelectItem>
                  <SelectItem value="MISSED">Missed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending || !name.trim() || !targetDate}>
              {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Milestone"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MilestoneCard({
  milestone,
  onEdit,
  onDelete,
}: {
  milestone: ProjectMilestone;
  onEdit: (milestone: ProjectMilestone) => void;
  onDelete: (milestone: ProjectMilestone) => void;
}) {
  const cfg = STATUS_CONFIG[milestone.status];
  const dateObj = new Date(milestone.targetDate);
  const daysLeft = differenceInDays(dateObj, new Date());
  const overdue = isPast(dateObj) && !isToday(dateObj) && milestone.status === "PENDING";

  const handleEdit = useCallback(() => onEdit(milestone), [onEdit, milestone]);
  const handleDelete = useCallback(() => onDelete(milestone), [onDelete, milestone]);

  return (
    <Card className={cn(
      "rounded-lg hover:shadow-md transition-shadow",
      overdue ? "border border-destructive/40 bg-card" : "border border-border bg-card"
    )}>
      <CardContent className="pt-3 pb-3 px-4">
        <div className="flex items-start gap-3">
          <Diamond
            className={cn("h-4 w-4 mt-0.5 shrink-0", cfg.color)}
            fill="currentColor"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{milestone.name}</p>
                {milestone.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{milestone.description}</p>
                )}
              </div>
              <Badge variant={cfg.variant} className="text-xs shrink-0">{cfg.label}</Badge>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarCheck2 className="h-3.5 w-3.5 shrink-0" />
                <span>{format(dateObj, "MMM d, yyyy")}</span>
                {milestone.status === "PENDING" && (
                  <span className={overdue ? "text-destructive font-medium" : ""}>
                    {overdue
                      ? `${Math.abs(daysLeft)}d overdue`
                      : daysLeft === 0
                      ? "Today"
                      : `${daysLeft}d left`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleEdit}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={handleDelete}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MilestonesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: projectIdStr } = use(params);
  const projectId = Number(projectIdStr);
  const { data: milestones, isLoading } = useProjectMilestones(projectId);
  const deleteMilestone = useDeleteMilestone(projectId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectMilestone | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectMilestone | null>(null);

  const total = milestones?.length ?? 0;
  const achieved = milestones?.filter((m) => m.status === "ACHIEVED").length ?? 0;
  const pending = milestones?.filter((m) => m.status === "PENDING").length ?? 0;
  const overdue = milestones?.filter((m) => {
    const d = new Date(m.targetDate);
    return isPast(d) && !isToday(d) && m.status === "PENDING";
  }).length ?? 0;

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCloseCreate = useCallback(() => setCreateOpen(false), []);

  const handleEditTarget = useCallback((m: ProjectMilestone) => setEditTarget(m), []);
  const handleCloseEdit = useCallback(() => setEditTarget(null), []);
  const handleDeleteTarget = useCallback((m: ProjectMilestone) => setDeleteTarget(m), []);

  const handleAlertDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMilestone.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Milestone deleted"); setDeleteTarget(null); },
      onError: () => toast.error("Failed to delete"),
    });
  }, [deleteTarget, deleteMilestone]);

  return (
    <PageWrapper
      title="Milestones"
      subtitle="Key checkpoints and target dates for this project"
      backHref={`/projects/${projectId}`}
      actions={
        <Button
          size="sm"
          onClick={handleOpenCreate}
        >
          <Plus className="h-4 w-4 mr-1" /> New Milestone
        </Button>
      }
    >
      <div className="space-y-4">
        <StatCardGrid cols={4}>
          <StatCard label="Total" value={total} icon={Diamond} tone="default" index={0} />
          <StatCard label="Achieved" value={achieved} icon={CheckCircle2} tone="emerald" index={1} />
          <StatCard label="Pending" value={pending} icon={Clock} tone="blue" index={2} />
          <StatCard label="Overdue" value={overdue} icon={AlertCircle} tone="red" index={3} />
        </StatCardGrid>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        ) : milestones && milestones.length > 0 ? (
          <div className="space-y-3">
            {milestones.map((m) => (
              <MilestoneCard
                key={m.id}
                milestone={m}
                onEdit={handleEditTarget}
                onDelete={handleDeleteTarget}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            illustration={<Diamond className="h-8 w-8 text-muted-foreground/40" fill="currentColor" />}
            title="No milestones yet"
            description="Add milestones to track key checkpoints and target dates."
            action={{ label: "Add Milestone", onClick: handleOpenCreate }}
            className="min-h-[40vh]"
          />
        )}
      </div>

      {createOpen && (
        <MilestoneDialog projectId={projectId} onClose={handleCloseCreate} />
      )}
      {editTarget && (
        <MilestoneDialog
          projectId={projectId}
          milestone={editTarget}
          onClose={handleCloseEdit}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={handleAlertDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete milestone?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
