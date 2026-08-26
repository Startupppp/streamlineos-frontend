"use client";

import { use, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  Edit2,
  Trophy,
  XCircle,
  ChevronRight,
  Copy,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useDealDetail,
  useUpdateDeal,
  useUpdateDealStage,
  useLogDealActivity,
  useDealMeetings,
  useCreateDealMeeting,
  useDeleteDealMeeting,
  useCloneDeal,
  useCrmStages,
} from "@/hooks/api/crm";
import { formatDealId, formatMoneyCompact } from "@/lib/format-utils";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { RecordDetail, asRecordValue } from "@/features/renderer";
import { dealRecordFields } from "@/lib/renderer/crm/deal-layout";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { DealEditForm } from "@/features/crm/deals/detail/deal-edit-form";
import { toUpdateInput, type DealSubmission } from "@/features/crm/deals/deal-form";
import { useDealLayout } from "@/features/crm/deals/use-deal-layout";
import { LogActivityDialog } from "@/features/crm/deals/detail/log-activity-dialog";
import {
  MeetingDialog,
  CreateProjectDialog,
} from "@/features/crm/deals/detail/deal-dialogs";
import { DealSidebarCards } from "@/features/crm/deals/detail/deal-sidebar-cards";
import { DealLinkedRecordsCard } from "@/features/crm/deals/detail/deal-linked-records-card";
import { DealStageHistory } from "@/features/crm/deals/detail/deal-stage-history";
import { DealQuotesSection } from "@/features/crm/deals/deal-quotes-section";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState } from "@/components/shared";
import { DealInlineAiMenu } from "@/features/crm/shared/crm-inline-ai-menu";

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId: dealIdStr } = use(params);
  const dealId = Number(dealIdStr);
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const layout = useDealLayout();
  const money = useOrgDisplay();

  const { data: deal, isLoading, isError, error, refetch } = useDealDetail(dealId);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "call" | "note" | "email" | "meeting";
    label: string;
  } | null>(null);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const updateDeal = useUpdateDeal();
  const {
    data: meetings,
    isLoading: meetingsLoading,
    isError: meetingsError,
    refetch: refetchMeetings,
  } = useDealMeetings(dealId);
  const logActivity = useLogDealActivity();
  const createMeeting = useCreateDealMeeting(dealId);
  const deleteMeeting = useDeleteDealMeeting(dealId);
  const updateStage = useUpdateDealStage();
  const cloneDeal = useCloneDeal();
  const { data: stages = [] } = useCrmStages("deal");
  const wonStage = useMemo(() => stages.find((s) => s.stageType === "won")?.key ?? "WON", [stages]);
  const lostStage = useMemo(() => stages.find((s) => s.stageType === "lost")?.key ?? "LOST", [stages]);

  const handleClone = useCallback(() => {
    cloneDeal.mutate(dealId, {
      onSuccess: (newDeal) => {
        toast.success("Deal cloned");
        router.push(`/crm/deals/${newDeal.id}`);
      },
      onError: () => toast.error("Failed to clone deal"),
    });
  }, [dealId, cloneDeal, router]);

  const currentStageIndex = useMemo(() => {
    if (!deal) return -1;
    return stages.findIndex((s) => s.key === deal.stage);
  }, [deal, stages]);

  const handleStageChange = useCallback(
    (stage: string) => {
      updateStage.mutate(
        { id: dealId, stage },
        {
          onSuccess: (result) => {
            if (result && "approvalPending" in result && result.approvalPending) {
              toast.info("Approval request submitted. Stage will update once approved.");
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

  const handleRetryMeetings = useCallback(() => { void refetchMeetings(); }, [refetchMeetings]);
  const handleToggleEdit = useCallback(() => setIsEditing((v) => !v), []);
  const handleCancelEdit = useCallback(() => setIsEditing(false), []);
  const handleMarkWon = useCallback(() => handleStageChange(wonStage), [handleStageChange, wonStage]);
  const handleMarkLost = useCallback(() => handleStageChange(lostStage), [handleStageChange, lostStage]);

  const handleStagePipelineClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const stage = e.currentTarget.dataset.stage;
      if (stage) handleStageChange(stage);
    },
    [handleStageChange],
  );

  const handleQuickActionClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const raw = e.currentTarget.dataset.actionType;
      const label = e.currentTarget.dataset.actionLabel ?? "";
      if (raw === "call" || raw === "note" || raw === "email" || raw === "meeting") {
        setPendingAction({ type: raw, label });
      }
    },
    [],
  );

  const handleLogActivity = useCallback(
    (notes: string) => {
      if (!pendingAction) return;
      logActivity.mutate(
        { dealId, type: pendingAction.type, subject: pendingAction.label, notes },
        {
          onSuccess: () => {
            toast.success("Activity logged");
            setPendingAction(null);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [pendingAction, logActivity, dealId],
  );

  const handleCloseLogDialog = useCallback(() => setPendingAction(null), []);

  const handleCreateMeeting = useCallback(
    (data: {
      title: string;
      scheduledAt: string;
      durationMinutes: number;
      attendees: string[];
      agenda?: string;
      notes?: string;
      actionItems?: string;
      recordingLink?: string;
    }) => {
      if (!data.title.trim() || !data.scheduledAt) {
        toast.error("Title and date are required");
        return;
      }
      createMeeting.mutate(data, {
        onSuccess: () => {
          toast.success("Meeting added");
          setMeetingDialogOpen(false);
        },
        onError: () => toast.error("Failed to add meeting"),
      });
    },
    [createMeeting],
  );

  const handleDeleteMeeting = useCallback(
    (meetingId: number) => {
      deleteMeeting.mutate(meetingId, {
        onSuccess: () => toast.success("Meeting removed"),
        onError: () => toast.error("Failed to remove meeting"),
      });
    },
    [deleteMeeting],
  );

  const handleCreateProject = useCallback(
    async (data: { name: string; startDate?: string; endDate?: string }) => {
      if (!data.name.trim()) {
        toast.error("Project name is required");
        return;
      }
      setIsCreatingProject(true);
      try {
        const newProject = await apiClient.post<{ id: number }>(
          "/build/from-deal",
          { dealId, name: data.name.trim(), startDate: data.startDate, endDate: data.endDate },
        );
        toast.success("Project created successfully");
        setCreateProjectOpen(false);
        router.push(`/build/${newProject.id}`);
      } catch {
        toast.error("Failed to create project");
      } finally {
        setIsCreatingProject(false);
      }
    },
    [dealId, router],
  );

  const handleRefetch = useCallback(() => { void refetch(); }, [refetch]);

  const handleOpenMeetingDialog = useCallback(() => setMeetingDialogOpen(true), []);
  const handleOpenCreateProject = useCallback(() => setCreateProjectOpen(true), []);

  const containerVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : staggerContainer;
  const itemVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : fadeUp;

  if (isLoading) {
    return (
      <PageWrapper title={`Deal #${dealIdStr}`} backHref="/crm/deals">
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
      <PageWrapper title={`Deal #${dealIdStr}`} backHref="/crm/deals">
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

  const keyDates = [
    { label: "Created", value: deal.createdAt },
    { label: "Updated", value: deal.updatedAt },
    { label: "Expected Close", value: deal.expectedCloseDate },
    { label: "Actual Close", value: deal.actualCloseDate },
  ];

  return (
    <PageWrapper
      title={deal.name}
      backHref="/crm/deals"
      subtitle={
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded select-all">
            {formatDealId(dealId)}
          </span>
          <span className="tabular-nums">{formatMoneyCompact(dealValue, money)}</span>
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMarkLost}
                >
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
              <Button size="sm" variant="outline" onClick={handleOpenCreateProject}>
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
      <motion.div
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center gap-1 p-2 rounded-lg bg-muted/30 border border-border"
        >
          {stages.map((stage, i) => {
            const isActive = stage.key === deal.stage;
            const isPast = i < currentStageIndex;
            return (
              <button
                key={stage.key}
                data-stage={stage.key}
                onClick={handleStagePipelineClick}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-primary/10 text-foreground ring-1 ring-primary/30"
                    : isPast
                      ? "bg-muted/50 text-muted-foreground"
                      : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30",
                )}
                style={
                  isActive && currentStageInfo?.color
                    ? { backgroundColor: `${currentStageInfo.color}15`, color: currentStageInfo.color }
                    : undefined
                }
              >
                {stage.label}
                {i < stages.length - 1 && (
                  <ChevronRight className="h-3 w-3 ml-1 text-muted-foreground/30" />
                )}
              </button>
            );
          })}
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-5">
          <motion.div variants={itemVariants} className="lg:col-span-3 space-y-4">
            {isEditing ? (
              <DealEditForm
                deal={deal}
                isPending={updateDeal.isPending}
                onSubmit={onEditSubmit}
                onCancel={handleCancelEdit}
              />
            ) : (
              <>
                <RecordDetail
                  layout={layout}
                  record={asRecordValue(dealRecordFields(deal))}
                  money={money}
                  showTitle={false}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClone}
                  disabled={cloneDeal.isPending}
                  className="w-full"
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Clone Deal
                </Button>
              </>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
            <DealSidebarCards
              dealId={dealId}
              dealName={deal.name}
              assignedTo={deal.assignedTo}
              lead={deal.lead}
              client={deal.client}
              keyDates={keyDates}
              meetings={meetings}
              meetingsLoading={meetingsLoading}
              meetingsError={meetingsError}
              onRetryMeetings={handleRetryMeetings}
              onQuickActionClick={handleQuickActionClick}
              onAddMeeting={handleOpenMeetingDialog}
              onDeleteMeeting={handleDeleteMeeting}
              healthScore={deal.healthScore}
              nextStep={deal.nextStep}
              pipelineId={deal.pipelineId}
            />
            <DealLinkedRecordsCard partyId={deal.partyId} subjectId={deal.subjectId} />
            <DealStageHistory dealId={dealId} card />
            <DealQuotesSection dealId={dealId} />
          </motion.div>
        </div>
      </motion.div>

      <MeetingDialog
        open={meetingDialogOpen}
        onOpenChange={setMeetingDialogOpen}
        onSubmit={handleCreateMeeting}
        isPending={createMeeting.isPending}
      />

      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        defaultName={deal.name}
        onSubmit={handleCreateProject}
        isPending={isCreatingProject}
      />

      <LogActivityDialog
        open={pendingAction !== null}
        actionLabel={pendingAction?.label ?? ""}
        isPending={logActivity.isPending}
        onClose={handleCloseLogDialog}
        onSubmit={handleLogActivity}
      />
    </PageWrapper>
  );
}
