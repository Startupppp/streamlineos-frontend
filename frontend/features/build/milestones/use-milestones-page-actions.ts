"use client";

import { useState, useCallback, type RefObject } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useDeleteMilestone,
  useUpdateMilestone,
  type ProjectMilestone,
} from "@/hooks/api/build/milestones";
import { toMilestoneStatus } from "@/features/build/milestones/milestone-status";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";

interface UseMilestonesPageActionsInput {
  projectId: number;
  milestones: ProjectMilestone[];
  searchInputRef: RefObject<HTMLInputElement | null>;
}

export function useMilestonesPageActions({
  projectId,
  milestones,
  searchInputRef,
}: UseMilestonesPageActionsInput) {
  const updateMilestone = useUpdateMilestone(projectId);
  const deleteMilestone = useDeleteMilestone(projectId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectMilestone | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectMilestone | null>(null);
  const [selectedMilestoneIds, setSelectedMilestoneIds] = useState<Set<number>>(new Set<number>());

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCloseCreate = useCallback(() => setCreateOpen(false), []);
  const handleEditTarget = useCallback((m: ProjectMilestone) => setEditTarget(m), []);
  const handleCloseEdit = useCallback(() => setEditTarget(null), []);
  const handleDeleteTarget = useCallback((m: ProjectMilestone) => setDeleteTarget(m), []);

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
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

  const handleClearSelection = useCallback(() => {
    setSelectedMilestoneIds(new Set<number>());
  }, []);

  const handleMilestoneSelect = useCallback(
    (m: ProjectMilestone, checked: boolean) => {
      setSelectedMilestoneIds((prev) => {
        const next = new Set(prev);
        if (checked) next.add(m.id); else next.delete(m.id);
        return next;
      });
    },
    [],
  );

  const handleBulkStatusChange = useCallback(
    (status: string) => {
      const typed = toMilestoneStatus(status);
      const targets = Array.from(selectedMilestoneIds)
        .map((milestoneId) => milestones.find((m) => m.id === milestoneId))
        .filter((m): m is ProjectMilestone => m !== undefined);
      let settled = 0;
      const failures: string[] = [];
      const report = () => {
        settled += 1;
        if (settled < targets.length) return;
        if (failures.length === 0) {
          toast.success(`${targets.length} milestones updated`);
          return;
        }
        toast.error(
          `${targets.length - failures.length} of ${targets.length} milestones updated. Failed: ${failures.join(", ")}`,
        );
      };
      targets.forEach((target) => {
        updateMilestone.mutate({ milestoneId: target.id, version: target.version, status: typed }, {
          onSuccess: report,
          onError: (err) => {
            failures.push(`${target.name} — ${getErrorMessage(err)}`);
            report();
          },
        });
      });
      setSelectedMilestoneIds(new Set<number>());
    },
    [selectedMilestoneIds, updateMilestone, milestones],
  );

  const handleOpenByIndex = useCallback(
    (index: number) => {
      const m = milestones[index];
      if (m) handleEditTarget(m);
    },
    [milestones, handleEditTarget],
  );

  const handleEditByIndex = useCallback(
    (index: number) => {
      const m = milestones[index];
      if (m) handleEditTarget(m);
    },
    [milestones, handleEditTarget],
  );

  useBuildListKeyboard({
    itemCount: milestones.length,
    onOpen: handleOpenByIndex,
    onEdit: handleEditByIndex,
    onCreate: handleOpenCreate,
    onClearSelection: handleClearSelection,
    searchInputRef,
  });

  return {
    createOpen,
    editTarget,
    deleteTarget,
    selectedMilestoneIds,
    deleteMilestone,
    handleOpenCreate,
    handleCloseCreate,
    handleEditTarget,
    handleCloseEdit,
    handleDeleteTarget,
    handleDeleteDialogOpenChange,
    handleDelete,
    handleClearSelection,
    handleMilestoneSelect,
    handleBulkStatusChange,
  };
}
