"use client";

import { use, useState, useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
import { Diamond, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import {
  useProjectMilestones,
  useDeleteMilestone,
  type ProjectMilestone,
} from "@/hooks/api/projects";
import { MilestoneUpsertSheet } from "@/features/projects/milestones/milestone-upsert-sheet";
import { MilestoneCard } from "@/features/projects/milestones/milestone-card";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { isPast, isToday } from "date-fns";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
} from "@/features/projects/shared/pm-chrome";

function NewMilestoneButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" className="h-8 gap-1.5" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} />
      New Milestone
    </Button>
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
  const overdue =
    milestones?.filter((m) => {
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
      onSuccess: () => {
        toast.success("Milestone deleted");
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [deleteTarget, deleteMilestone]);

  if (isLoading) {
    return (
      <PageWrapper
        title="Milestones"
        actions={<Skeleton className="h-8 w-36 rounded-md" />}
      >
        <PmPageShell>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          </div>
        </PmPageShell>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Milestones"
      subtitle="Key checkpoints and target dates for this project"
      actions={<NewMilestoneButton onClick={handleOpenCreate} />}
    >
      <PmPageShell>
        <div className="space-y-4">
          <PmSection index={0}>
            <StatCardGrid cols={4}>
              <StatCard label="Total" value={total} icon={Diamond} tone="default" index={0} />
              <StatCard
                label="Achieved"
                value={achieved}
                icon={CheckCircle2}
                tone="emerald"
                index={1}
              />
              <StatCard label="Pending" value={pending} icon={Clock} tone="blue" index={2} />
              <StatCard label="Overdue" value={overdue} icon={AlertCircle} tone="red" index={3} />
            </StatCardGrid>
          </PmSection>

          <PmSection index={1}>
            {milestones && milestones.length > 0 ? (
              <PmStaggerList className="space-y-2.5" aria-label="Project milestones">
                {milestones.map((m) => (
                  <MilestoneCard
                    key={m.id}
                    milestone={m}
                    onEdit={handleEditTarget}
                    onDelete={handleDeleteTarget}
                  />
                ))}
              </PmStaggerList>
            ) : (
              <EmptyState
                illustrationPreset="projects"
                title="No milestones yet"
                description="Add milestones to track key checkpoints and target dates."
                action={{ label: "Add Milestone", onClick: handleOpenCreate }}
                className="min-h-[40vh]"
              />
            )}
          </PmSection>
        </div>

        {createOpen ? (
          <MilestoneUpsertSheet projectId={projectId} onClose={handleCloseCreate} />
        ) : null}
        {editTarget ? (
          <MilestoneUpsertSheet
            projectId={projectId}
            milestone={editTarget}
            onClose={handleCloseEdit}
          />
        ) : null}

        <AlertDialog open={!!deleteTarget} onOpenChange={handleAlertDialogOpenChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete milestone?</AlertDialogTitle>
              <AlertDialogDescription>
                &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMilestone.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
                disabled={deleteMilestone.isPending}
              >
                {deleteMilestone.isPending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PmPageShell>
    </PageWrapper>
  );
}
