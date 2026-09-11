"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { EmptySprintIllustration } from "@/components/illustrations";
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
import { useHiringFlows, useDeleteHiringFlow } from "@/hooks/api/hr/recruitment";
import { getErrorMessage } from "@/lib/get-error-message";
import type { HiringFlow, HiringFlowRound } from "@/types/hr/recruitment";
import { ErrorState } from "@/components/shared/error-state";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { FlowCard } from "@/features/hr/recruitment/hiring-flows/flow-card";
import { FlowFormSheet } from "@/features/hr/recruitment/hiring-flows/flow-form-sheet";
import { RoundFormSheet } from "@/features/hr/recruitment/hiring-flows/round-form-sheet";

export function HiringFlowsPage() {
  const { data: flows, isLoading, isError, refetch } = useHiringFlows();
  const deleteFlow = useDeleteHiringFlow();

  const [flowSheetOpen, setFlowSheetOpen] = useState(false);
  const [editFlow, setEditFlow] = useState<HiringFlow | null>(null);
  const [roundSheetOpen, setRoundSheetOpen] = useState(false);
  const [editRound, setEditRound] = useState<HiringFlowRound | null>(null);
  const [activeFlowId, setActiveFlowId] = useState<number>(0);
  const [deleteTarget, setDeleteTarget] = useState<HiringFlow | null>(null);

  const handleOpenCreateFlow = useCallback(() => {
    setEditFlow(null);
    setFlowSheetOpen(true);
  }, []);

  const handleOpenEditFlow = useCallback((flow: HiringFlow) => {
    setEditFlow(flow);
    setFlowSheetOpen(true);
  }, []);

  const handleOpenAddRound = useCallback((flow: HiringFlow) => {
    setActiveFlowId(flow.id);
    setEditRound(null);
    setRoundSheetOpen(true);
  }, []);

  const handleOpenEditRound = useCallback((round: HiringFlowRound, flowId: number) => {
    setActiveFlowId(flowId);
    setEditRound(round);
    setRoundSheetOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteFlow.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Hiring flow deleted");
        setDeleteTarget(null);
      },
      onError: (e) => {
        toast.error(getErrorMessage(e));
        setDeleteTarget(null);
      },
    });
  }, [deleteFlow, deleteTarget]);

  const handleFlowSheetClose = useCallback(() => {
    setFlowSheetOpen(false);
  }, []);

  const handleRoundSheetClose = useCallback(() => {
    setRoundSheetOpen(false);
  }, []);

  const handleDeleteAlertChange = useCallback((v: boolean) => {
    if (!v) setDeleteTarget(null);
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-1 min-h-0 flex-col">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      );
    }

    if (isError) {
      return (
        <ErrorState
          title="Unable to load hiring flows"
          description="Try again. If this keeps happening, check your permissions or contact an admin."
          onRetry={() => void refetch()}
        />
      );
    }

    if (!flows || flows.length === 0) {
      return (
        <RecruitmentEmptyState
          illustration={<EmptySprintIllustration />}
          title="No hiring flows yet"
          description="Create reusable interview workflows to assign to job postings."
          action={{ label: "New Hiring Flow", onClick: handleOpenCreateFlow }}
        />
      );
    }

    return (
      <div className="flex flex-1 min-h-0 flex-col">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              onEdit={handleOpenEditFlow}
              onAddRound={handleOpenAddRound}
              onEditRound={handleOpenEditRound}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <PageWrapper
        title="Hiring Flows"
        subtitle="Define reusable multi-round interview workflows"
        actions={
          <AnimatedIconButton icon={PlusIcon} iconSize={16} size="sm" onClick={handleOpenCreateFlow}>
            New Flow
          </AnimatedIconButton>
        }
      >
        {renderContent()}
      </PageWrapper>

      <FlowFormSheet open={flowSheetOpen} editFlow={editFlow} onClose={handleFlowSheetClose} />

      <RoundFormSheet
        open={roundSheetOpen}
        flowId={activeFlowId}
        editRound={editRound}
        onClose={handleRoundSheetClose}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteAlertChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete hiring flow?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; and all its rounds will be permanently deleted. Job
              postings using this flow will be unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteFlow.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
