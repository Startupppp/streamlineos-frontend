"use client";

import { use, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
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
import { AIPredictDealButton } from "@/features/crm/deals/ai-predict-deal-button";
import {
  MeetingDialog,
  CreateProjectDialog,
} from "@/features/crm/deals/detail/deal-dialogs";
import { DealInfoCard } from "@/features/crm/deals/detail/deal-info-card";
import { DealSidebarCards } from "@/features/crm/deals/detail/deal-sidebar-cards";

const STAGES = [
  { key: "LEAD", label: "Lead", color: "#3B82F6", bg: "bg-blue-500/10" },
  {
    key: "CONTACTED",
    label: "Contacted",
    color: "#0EA5E9",
    bg: "bg-sky-500/10",
  },
  {
    key: "PROPOSAL",
    label: "Proposal",
    color: "#F59E0B",
    bg: "bg-amber-500/10",
  },
  {
    key: "NEGOTIATION",
    label: "Negotiation",
    color: "#8B5CF6",
    bg: "bg-purple-500/10",
  },
  { key: "WON", label: "Won", color: "#10B981", bg: "bg-emerald-500/10" },
  { key: "LOST", label: "Lost", color: "#EF4444", bg: "bg-red-500/10" },
] as const;

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

  const handleBackToDeals = useCallback(
    () => router.push("/crm/deals"),
    [router],
  );
  const handleToggleEdit = useCallback(() => setIsEditing((v) => !v), []);
  const handleCancelEdit = useCallback(() => setIsEditing(false), []);
  const handleMarkWon = useCallback(
    () => handleStageChange("WON"),
    [handleStageChange],
  );
  const handleMarkLost = useCallback(
    () => handleStageChange("LOST"),
    [handleStageChange],
  );

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
        {
          dealId,
          type: pendingAction.type,
          subject: pendingAction.label,
          notes,
        },
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
          {
            dealId,
            name: data.name.trim(),
            startDate: data.startDate,
            endDate: data.endDate,
          },
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

  const handleOpenMeetingDialog = useCallback(
    () => setMeetingDialogOpen(true),
    [],
  );
  const handleOpenCreateProject = useCallback(
    () => setCreateProjectOpen(true),
    [],
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-[500px] lg:col-span-3" />
          <Skeleton className="h-[500px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-muted-foreground">Deal not found</p>
        <Button variant="outline" onClick={handleBackToDeals}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Deals
        </Button>
      </div>
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

  return (
    <PageWrapper
      title={deal.name}
      subtitle={
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded select-all">
            {formatDealId(dealId)}
          </span>
          <span>{formatINR(dealValue)}</span>
        </span>
      }
      badge={
        <Badge
          className="text-sm px-3 py-1"
          style={{
            backgroundColor: `${stageConfig.color}20`,
            color: stageConfig.color,
          }}
        >
          {stageConfig.label}
        </Badge>
      }
      actions={
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToDeals}
            aria-label="Back to deals"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {deal.probability !== null && (
            <Badge variant="secondary" className="text-xs">
              {deal.probability}% probability
            </Badge>
          )}
          <AIPredictDealButton dealId={dealId} compact />
          <Button
            variant="outline"
            size="sm"
            onClick={handleClone}
            disabled={cloneDeal.isPending}
          >
            <Copy className="h-4 w-4 mr-1" />
            Clone
          </Button>
          <Button variant="outline" size="sm" onClick={handleToggleEdit}>
            <Edit2 className="h-4 w-4 mr-1" />
            {isEditing ? "Cancel" : "Edit"}
          </Button>
          {deal.stage !== "WON" && deal.stage !== "LOST" && (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleMarkWon}
              >
                <Trophy className="h-4 w-4 mr-1" />
                Mark Won
              </Button>
              <Button size="sm" variant="destructive" onClick={handleMarkLost}>
                <XCircle className="h-4 w-4 mr-1" />
                Mark Lost
              </Button>
            </>
          )}
          {(deal.stage === "WON" || deal.stage === "NEGOTIATION") && (
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleOpenCreateProject}
            >
              <FolderKanban className="h-4 w-4 mr-1" />
              Create Project
            </Button>
          )}
        </>
      }
    >
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={fadeUp}
          className="flex flex-wrap items-center gap-1 p-2 rounded-xl bg-muted/30 border border-border/50"
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
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  isActive
                    ? cn(stage.bg, "ring-1 ring-current/20")
                    : isPast
                      ? "bg-muted/50 text-muted-foreground"
                      : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30",
                )}
                style={isActive ? { color: stage.color } : undefined}
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
          <motion.div variants={fadeUp} className="lg:col-span-3 space-y-6">
            {isEditing ? (
              <DealEditForm
                deal={deal}
                isPending={updateDeal.isPending}
                onSubmit={onEditSubmit}
                onCancel={handleCancelEdit}
              />
            ) : (
              <DealInfoCard deal={deal} />
            )}
          </motion.div>

          <motion.div variants={fadeUp} className="lg:col-span-2 space-y-6">
            <DealSidebarCards
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
