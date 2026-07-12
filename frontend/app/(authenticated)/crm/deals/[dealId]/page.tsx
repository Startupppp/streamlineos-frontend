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
  useDealActivities,
  useLogDealActivity,
  useDealMeetings,
  useCreateDealMeeting,
  useDeleteDealMeeting,
  useCloneDeal,
} from "@/hooks/api/crm";
import { formatDealId } from "@/lib/format-utils";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import {
  DealEditForm,
  type EditFormValues,
} from "@/features/crm/deals/detail/deal-edit-form";
import { LogActivityDialog } from "@/features/crm/deals/detail/log-activity-dialog";
import {
  MeetingDialog,
  CreateProjectDialog,
} from "@/features/crm/deals/detail/deal-dialogs";
import { DealInfoCard } from "@/features/crm/deals/detail/deal-info-card";
import { DealSidebarCards } from "@/features/crm/deals/detail/deal-sidebar-cards";
import { DealOrdersSection } from "@/features/crm/deals/deal-orders-section";
import { DealQuotesSection } from "@/features/crm/deals/deal-quotes-section";

const STAGES = [
  { key: "LEAD", label: "Lead", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "CONTACTED", label: "Contacted", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" },
  { key: "PROPOSAL", label: "Proposal", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "NEGOTIATION", label: "Negotiation", badgeClass: "bg-violet-50 text-violet-700 border-violet-200" },
  { key: "WON", label: "Won", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "LOST", label: "Lost", badgeClass: "bg-red-50 text-red-700 border-red-200" },
] as const;

const STAGE_ACTIVE_CLASSES: Record<string, string> = {
  LEAD: "bg-blue-50 text-blue-700 ring-1 ring-blue-300",
  CONTACTED: "bg-sky-50 text-sky-700 ring-1 ring-sky-300",
  PROPOSAL: "bg-amber-50 text-amber-700 ring-1 ring-amber-300",
  NEGOTIATION: "bg-violet-50 text-violet-700 ring-1 ring-violet-300",
  WON: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300",
  LOST: "bg-red-50 text-red-700 ring-1 ring-red-300",
};

type DealStage = (typeof STAGES)[number]["key"];

function formatINR(v: number) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId: dealIdStr } = use(params);
  const dealId = Number(dealIdStr);
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const { data: deal, isLoading } = useDealDetail(dealId);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "call" | "note" | "email" | "meeting";
    label: string;
  } | null>(null);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const updateDeal = useUpdateDeal();
  const { data: activities } = useDealActivities(dealId, 30);
  const { data: meetings } = useDealMeetings(dealId);
  const logActivity = useLogDealActivity();
  const createMeeting = useCreateDealMeeting(dealId);
  const deleteMeeting = useDeleteDealMeeting(dealId);
  const updateStage = useUpdateDealStage();
  const cloneDeal = useCloneDeal();

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
    return STAGES.findIndex((s) => s.key === deal.stage);
  }, [deal]);

  const handleStageChange = useCallback(
    (stage: DealStage) => {
      updateStage.mutate(
        { id: dealId, stage },
        {
          onSuccess: () => toast.success("Stage updated"),
          onError: (err) => toast.error(err.message),
        },
      );
    },
    [dealId, updateStage],
  );

  const onEditSubmit = useCallback(
    (data: EditFormValues) => {
      updateDeal.mutate(
        {
          id: dealId,
          name: data.name,
          value: data.value || "0",
          stage: data.stage,
          probability: data.probability ? Number(data.probability) : undefined,
          contactPerson: data.contactPerson || undefined,
          contactEmail: data.contactEmail || undefined,
          contactPhone: data.contactPhone || undefined,
          expectedCloseDate: data.expectedCloseDate || undefined,
          notes: data.notes || undefined,
          lostReason: data.lostReason || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Deal updated");
            setIsEditing(false);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    },
    [dealId, updateDeal],
  );

  const handleToggleEdit = useCallback(() => setIsEditing((v) => !v), []);
  const handleCancelEdit = useCallback(() => setIsEditing(false), []);
  const handleMarkWon = useCallback(() => handleStageChange("WON"), [handleStageChange]);
  const handleMarkLost = useCallback(() => handleStageChange("LOST"), [handleStageChange]);

  const handleStagePipelineClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const raw = e.currentTarget.dataset.stage;
      const stage = STAGES.find((s) => s.key === raw)?.key;
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
          onError: (err) => toast.error(err.message),
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
          "/projects/from-deal",
          { dealId, name: data.name.trim(), startDate: data.startDate, endDate: data.endDate },
        );
        toast.success("Project created successfully");
        setCreateProjectOpen(false);
        router.push(`/projects/${newProject.id}`);
      } catch {
        toast.error("Failed to create project");
      } finally {
        setIsCreatingProject(false);
      }
    },
    [dealId, router],
  );

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
        <div className="space-y-6">
          <div className="flex flex-wrap gap-1 p-2 rounded-lg bg-muted/30 border border-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-lg" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-5">
            <Skeleton className="h-64 lg:col-span-3 rounded-lg" />
            <Skeleton className="h-64 lg:col-span-2 rounded-lg" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!deal) {
    return (
      <PageWrapper title="Deal Not Found" backHref="/crm/deals">
        <div className="flex-1 flex items-center justify-center min-h-[50vh]">
          <EmptyState
            title="Deal not found"
            description="This deal may have been deleted or you may not have access."
            action={{ label: "Back to Deals", href: "/crm/deals" }}
          />
        </div>
      </PageWrapper>
    );
  }

  const stageConfig = STAGES.find((s) => s.key === deal.stage) ?? STAGES[0];
  const dealValue = Number(deal.value ?? 0);

  const keyDates = [
    { label: "Created", value: deal.createdAt },
    { label: "Updated", value: deal.updatedAt },
    { label: "Expected Close", value: deal.expectedCloseDate },
    { label: "Actual Close", value: deal.actualCloseDate },
  ];

  const isActiveDeal = deal.stage !== "WON" && deal.stage !== "LOST";

  return (
    <PageWrapper
      title={deal.name}
      backHref="/crm/deals"
      subtitle={
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded select-all">
            {formatDealId(dealId)}
          </span>
          <span className="tabular-nums">{formatINR(dealValue)}</span>
        </span>
      }
      badge={
        <Badge
          variant="outline"
          className={cn("text-xs px-2 py-0.5", stageConfig.badgeClass)}
        >
          {stageConfig.label}
        </Badge>
      }
      actions={
        isEditing ? (
          <Button variant="outline" size="sm" onClick={handleCancelEdit}>
            Cancel
          </Button>
        ) : (
          <>
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleMarkWon}
                >
                  <Trophy className="h-3.5 w-3.5 mr-1" />
                  Won
                </Button>
              </>
            )}
            {deal.stage === "WON" && (
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
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center gap-1 p-2 rounded-lg bg-muted/30 border border-border"
        >
          {STAGES.map((stage, i) => {
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
                    ? STAGE_ACTIVE_CLASSES[stage.key]
                    : isPast
                      ? "bg-muted/50 text-muted-foreground"
                      : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30",
                )}
              >
                {stage.label}
                {i < STAGES.length - 1 && (
                  <ChevronRight className="h-3 w-3 ml-1 text-muted-foreground/30" />
                )}
              </button>
            );
          })}
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-5">
          <motion.div variants={itemVariants} className="lg:col-span-3 space-y-6">
            {isEditing ? (
              <DealEditForm
                deal={deal}
                isPending={updateDeal.isPending}
                onSubmit={onEditSubmit}
                onCancel={handleCancelEdit}
              />
            ) : (
              <>
                <DealInfoCard deal={deal} />
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
            <DealOrdersSection dealId={dealId} dealStage={deal.stage} />
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
            <DealSidebarCards
              dealId={dealId}
              dealName={deal.name}
              assignedTo={deal.assignedTo}
              lead={deal.lead}
              client={deal.client}
              keyDates={keyDates}
              meetings={meetings}
              activities={activities ?? []}
              onQuickActionClick={handleQuickActionClick}
              onAddMeeting={handleOpenMeetingDialog}
              onDeleteMeeting={handleDeleteMeeting}
            />
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
