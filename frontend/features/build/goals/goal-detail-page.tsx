"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CalendarDays,
  Users,
  FolderKanban,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  useGoal,
  useDeleteGoal,
  useRemoveGoalLink,
  type KeyResult,
  type GoalDetail,
} from "@/hooks/api/goals";
import { useCan } from "@/hooks/api/access";
import { GoalFormSheet } from "@/features/build/goals/goal-form-sheet";
import { CheckInDialog } from "@/features/build/goals/check-in-dialog";
import { AddLinkDialog } from "@/features/build/goals/add-link-dialog";
import { GoalDetailSkeleton } from "@/features/build/goals/goal-detail-skeleton";
import { STATUS_CONFIG } from "@/features/build/goals/constants";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_SECTION,
} from "@/components/pm-chrome";
import { TEXT_BODY } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { cn } from "@/lib/utils";
import { GoalDetailActions } from "./goal-detail-actions";
import {
  GoalKeyResultsSection,
  GoalLinkedItemsSection,
  GoalUpdatesTimeline,
} from "./goal-detail-sections";

export function GoalDetailPage({ goalId }: { goalId: number }) {
  const router = useRouter();
  const canManage = useCan("build:goals:manage");

  const { data: goal, isLoading, isError, error, refetch } = useGoal(goalId);
  const deleteGoal = useDeleteGoal();
  const removeLink = useRemoveGoalLink(goalId);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [checkInTarget, setCheckInTarget] = useState<KeyResult | null>(null);
  const [addLinkOpen, setAddLinkOpen] = useState(false);

  function handleOpenEdit() { setEditOpen(true); }
  function handleOpenDelete() { setDeleteOpen(true); }
  function handleOpenAddLink() { setAddLinkOpen(true); }
  function handleCloseAddLink() { setAddLinkOpen(false); }
  function handleCloseCheckIn() { setCheckInTarget(null); }
  function handleCheckIn(kr: KeyResult) { setCheckInTarget(kr); }
  function handleRetry() { void refetch(); }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || event.target.isContentEditable) return;
      }
      if (event.key === "e" && canManage) {
        event.preventDefault();
        setEditOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [canManage]);

  const pageState = usePageState({
    permission: "build:goals:view",
    isLoading,
    isError,
    error,
    isEmpty: !goal,
  });

  function handleDelete() {
    deleteGoal.mutate(goalId, {
      onSuccess: () => {
        toast.success("Goal deleted");
        router.push("/build/goals");
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleRemoveLink(linkId: number) {
    removeLink.mutate(linkId, {
      onSuccess: () => toast.success("Link removed"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  if (pageState.kind !== "ready") {
    return (
      <PageWrapper title="Goal" backHref="/build/goals">
        <PageState
          resolution={pageState}
          loading={<GoalDetailSkeleton />}
          empty={
            <PmPageShell>
              <PmSection index={0} className={PM_FILL_SECTION}>
                <EmptyState
                  className="flex-1"
                  illustrationPreset="projects"
                  title="Goal not found"
                  description="This goal may have been deleted or the link is invalid."
                  action={{ label: "Back to goals", href: "/build/goals" }}
                />
              </PmSection>
            </PmPageShell>
          }
          onRetry={handleRetry}
          className="flex-1"
        >
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  if (!goal) return null;

  const detail: GoalDetail = goal;
  const cfg = STATUS_CONFIG[detail.status];
  const ownerName = detail.owner?.name ?? detail.owner?.email ?? "Unassigned";

  return (
    <PageWrapper
      title={detail.title}
      backHref="/build/goals"
      actions={
        canManage ? (
          <GoalDetailActions onEdit={handleOpenEdit} onDelete={handleOpenDelete} />
        ) : undefined
      }
    >
      <PmPageShell>
        <PmSection index={0}>
          <PmPanel className="space-y-3 p-4">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <Badge variant={cfg.variant}>{cfg.label}</Badge>
              <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5 shrink-0" />
                <TruncatedText text={ownerName} />
              </div>
            </div>
            {detail.description ? (
              <p className={cn(TEXT_BODY, "text-sm leading-relaxed text-muted-foreground")}>
                {detail.description}
              </p>
            ) : null}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Overall progress</span>
                <span className="tabular-nums">{detail.progress}%</span>
              </div>
              <Progress value={detail.progress} className="h-2" />
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
              {detail.startDate ? (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Start {format(new Date(detail.startDate), "MMM d, yyyy")}
                </span>
              ) : null}
              {detail.dueDate ? (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Due {format(new Date(detail.dueDate), "MMM d, yyyy")}
                </span>
              ) : null}
              {detail.project ? (
                <span className="flex min-w-0 items-center gap-1.5">
                  <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                  <TruncatedText text={detail.project.name} />
                </span>
              ) : null}
            </div>
          </PmPanel>
        </PmSection>

        <GoalKeyResultsSection
          keyResults={detail.keyResults}
          onCheckIn={handleCheckIn}
          canManage={canManage}
        />
        <GoalLinkedItemsSection
          links={detail.links}
          canManage={canManage}
          onOpenAddLink={handleOpenAddLink}
          onRemoveLink={handleRemoveLink}
        />
        <GoalUpdatesTimeline updates={detail.updates} />
      </PmPageShell>

      {editOpen ? <GoalFormSheet open={editOpen} onOpenChange={setEditOpen} goal={detail} /> : null}
      {checkInTarget && canManage ? (
        <CheckInDialog
          goalId={goalId}
          keyResult={checkInTarget}
          onClose={handleCloseCheckIn}
        />
      ) : null}
      {addLinkOpen ? <AddLinkDialog goalId={goalId} onClose={handleCloseAddLink} /> : null}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete goal?"
        description={`"${detail.title}" and all its key results, updates, and links will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        isPending={deleteGoal.isPending}
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
