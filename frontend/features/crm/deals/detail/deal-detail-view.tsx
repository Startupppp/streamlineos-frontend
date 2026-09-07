"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Trophy, XCircle, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatDealId, formatMoneyCompact } from "@/lib/format-utils";
import { useOrgDisplay } from "@/hooks/api/org-display";
import {
  useDealDetail,
  useUpdateDeal,
  useUpdateDealStage,
  useCloneDeal,
  useCrmStages,
} from "@/hooks/api/crm";
import {
  toUpdateInput,
  type DealSubmission,
} from "@/features/crm/deals/deal-form";
import { DealInlineAiMenu } from "@/features/crm/shared/crm-inline-ai-menu";
import { LogActivityDialog } from "./log-activity-dialog";
import { MeetingDialog, CreateProjectDialog } from "./deal-dialogs";
import { DealDetailBody } from "./deal-detail-body";
import { useDealDetailActions } from "./use-deal-detail-actions";

interface DealDetailViewProps {
  dealIdParam: string;
}

export function DealDetailView({ dealIdParam }: DealDetailViewProps) {
  const dealId = Number(dealIdParam);
  const router = useRouter();
  const money = useOrgDisplay();

  const { data: deal, isLoading, isError, error, refetch } = useDealDetail(dealId);
  const [isEditing, setIsEditing] = useState(false);

  const updateDeal = useUpdateDeal();
  const updateStage = useUpdateDealStage();
  const cloneDeal = useCloneDeal();
  const { data: stages = [] } = useCrmStages("deal");
  const actions = useDealDetailActions(dealId);

  const wonStage = useMemo(
    () => stages.find((s) => s.stageType === "won")?.key ?? "WON",
    [stages],
  );
  const lostStage = useMemo(
    () => stages.find((s) => s.stageType === "lost")?.key ?? "LOST",
    [stages],
  );
  const currentStageIndex = useMemo(() => {
    if (!deal) return -1;
    return stages.findIndex((s) => s.key === deal.stage);
  }, [deal, stages]);

  const handleClone = useCallback(() => {
    cloneDeal.mutate(dealId, {
      onSuccess: (newDeal) => {
        toast.success("Deal cloned");
        router.push(`/crm/deals/${newDeal.id}`);
      },
      onError: () => toast.error("Failed to clone deal"),
    });
  }, [dealId, cloneDeal, router]);

  const handleStageChange = useCallback(
    (stage: string) => {
      updateStage.mutate(
        { id: dealId, stage },
        {
          onSuccess: (result) => {
            if (result && "approvalPending" in result && result.approvalPending) {
              toast.info(
                "Approval request submitted. Stage will update once approved.",
              );
            } else {
              toast.success("Stage updated");
            }
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [dealId, updateStage],
  );

  const onEditSubmit = useCallback(
    (submission: DealSubmission) => {
      updateDeal.mutate(toUpdateInput(submission, dealId), {
        onSuccess: () => {
          toast.success("Deal updated");
          setIsEditing(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [dealId, updateDeal],
  );

  const handleToggleEdit = useCallback(() => setIsEditing((v) => !v), []);
  const handleCancelEdit = useCallback(() => setIsEditing(false), []);
  const handleMarkWon = useCallback(
    () => handleStageChange(wonStage),
    [handleStageChange, wonStage],
  );
  const handleMarkLost = useCallback(
    () => handleStageChange(lostStage),
    [handleStageChange, lostStage],
  );
  const handleStagePipelineClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const stage = e.currentTarget.dataset.stage;
      if (stage) handleStageChange(stage);
    },
    [handleStageChange],
  );
  const handleRefetch = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <PageWrapper title={`Deal #${dealIdParam}`} backHref="/crm/deals">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1 p-2 rounded-lg bg-muted/30 border border-border">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20 rounded-lg" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-5">
            <Skeleton className="h-64 lg:col-span-3 rounded-lg" />
            <Skeleton className="h-64 lg:col-span-2 rounded-lg" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title={`Deal #${dealIdParam}`} backHref="/crm/deals">
        <ErrorState
          description={getErrorMessage(error)}
          onRetry={handleRefetch}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  if (!deal) {
    return (
      <PageWrapper title="Deal Not Found" backHref="/crm/deals">
        <EmptyState
          title="Deal not found"
          description="This deal may have been deleted or you may not have access."
          action={{ label: "Back to Deals", href: "/crm/deals" }}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  const currentStageInfo = stages.find((s) => s.key === deal.stage);
  const stageLabel = currentStageInfo?.label ?? deal.stage;
  const isActiveDeal = !(currentStageInfo?.isTerminal ?? false);
  const dealValue = Number(deal.value ?? 0);

  return (
    <PageWrapper
      title={deal.name}
      backHref="/crm/deals"
      subtitle={
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded select-all">
            {formatDealId(dealId)}
          </span>
          <span className="tabular-nums">
            {formatMoneyCompact(dealValue, money)}
          </span>
        </span>
      }
      badge={
        <Badge
          variant="outline"
          className="text-xs px-2 py-0.5"
          style={
            currentStageInfo?.color
              ? { borderColor: currentStageInfo.color, color: currentStageInfo.color }
              : undefined
          }
        >
          {stageLabel}
        </Badge>
      }
      actions={
        isEditing ? (
          <Button variant="outline" size="sm" onClick={handleCancelEdit}>
            Cancel
          </Button>
        ) : (
          <>
            <DealInlineAiMenu dealId={dealId} dealName={deal.name} />
            {isActiveDeal && (
              <>
                <Button size="sm" variant="outline" onClick={handleMarkLost}>
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Lost
                </Button>
                <Button
                  size="sm"
                  className="bg-status-success-fill hover:bg-status-success-fill-hover text-white"
                  onClick={handleMarkWon}
                >
                  <Trophy className="h-3.5 w-3.5 mr-1" />
                  Won
                </Button>
              </>
            )}
            {deal.stage === wonStage && (
              <Button size="sm" variant="outline" onClick={actions.handleOpenCreateProject}>
                <FolderKanban className="h-3.5 w-3.5 mr-1" />
                Create Project
              </Button>
            )}
            <Button size="sm" onClick={handleToggleEdit}>
              <Edit2 className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
          </>
        )
      }
    >
      <DealDetailBody
        deal={deal}
        dealId={dealId}
        stages={stages}
        currentStageIndex={currentStageIndex}
        currentStageColor={currentStageInfo?.color}
        isEditing={isEditing}
        isUpdating={updateDeal.isPending}
        isCloning={cloneDeal.isPending}
        meetings={actions.meetings}
        meetingsLoading={actions.meetingsLoading}
        meetingsError={actions.meetingsError}
        onStagePipelineClick={handleStagePipelineClick}
        onEditSubmit={onEditSubmit}
        onCancelEdit={handleCancelEdit}
        onClone={handleClone}
        onRetryMeetings={actions.handleRetryMeetings}
        onQuickActionClick={actions.handleQuickActionClick}
        onAddMeeting={actions.handleOpenMeetingDialog}
        onDeleteMeeting={actions.handleDeleteMeeting}
      />

      <MeetingDialog
        open={actions.meetingDialogOpen}
        onOpenChange={actions.setMeetingDialogOpen}
        onSubmit={actions.handleCreateMeeting}
        isPending={actions.isCreatingMeeting}
      />

      <CreateProjectDialog
        open={actions.createProjectOpen}
        onOpenChange={actions.setCreateProjectOpen}
        defaultName={deal.name}
        onSubmit={actions.handleCreateProject}
        isPending={actions.isCreatingProject}
      />

      <LogActivityDialog
        open={actions.pendingAction !== null}
        actionLabel={actions.pendingAction?.label ?? ""}
        isPending={actions.isLoggingActivity}
        onClose={actions.handleCloseLogDialog}
        onSubmit={actions.handleLogActivity}
      />
    </PageWrapper>
  );
}
