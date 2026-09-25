"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  EmptyTasksIllustration,
  EmptyActivityIllustration,
} from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { Trash2Icon, PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  Pencil,
  ListChecks,
  History,
  Link2,
  CalendarDays,
  Users,
  FolderKanban,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
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
import { KeyResultRow } from "@/features/build/goals/key-result-row";
import { LinkRow } from "@/features/build/goals/link-row";
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

function GoalDetailActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { iconRef: trashRef, hoverHandlers: trashHandlers } = useAnimatedIcon();
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onEdit}>
        <Pencil className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">Edit</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={onDelete}
        {...trashHandlers}
      >
        <Trash2Icon ref={trashRef} size={16} className="sm:mr-1" />
        <span className="hidden sm:inline">Delete</span>
      </Button>
    </div>
  );
}

function AddLinkButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" variant="outline" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} className="mr-1" /> Link
    </Button>
  );
}

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

  const pageState = usePageState({ permission: "build:goals:view", isLoading, isError, error });

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

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading") {
    return (
      <PageWrapper title="Goal" backHref="/build/goals">
        <PmPageShell>
          <PmSection index={0} className={PM_FILL_SECTION}>
            <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
              {null}
            </PageState>
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (pageState.kind === "loading") {
    return (
      <PageWrapper title="Goal" backHref="/build/goals">
        <GoalDetailSkeleton />
      </PageWrapper>
    );
  }

  if (!goal) {
    return (
      <PageWrapper title="Goal" backHref="/build/goals">
        <PmPageShell>
          <PmSection index={0} className={PM_FILL_SECTION}>
            <ErrorState
              title="Failed to load goal"
              description="This goal may have been removed or is unavailable."
              onRetry={handleRetry}
            />
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    );
  }

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

        <PmSection index={1} className="space-y-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Key Results</h2>
            <Badge variant="secondary" className="text-micro">
              {detail.keyResults.length}
            </Badge>
          </div>
          {detail.keyResults.length === 0 ? (
            <PmPanel className="flex items-center justify-center p-4">
              <EmptyState
                illustration={<EmptyTasksIllustration />}
                compact
                title="No key results"
                description="Edit this goal to add measurable key results."
              />
            </PmPanel>
          ) : (
            <div className="space-y-2">
              {detail.keyResults.map((kr) => (
                <KeyResultRow
                  key={kr.id}
                  keyResult={kr}
                  onCheckIn={handleCheckIn}
                  canManage={canManage}
                />
              ))}
            </div>
          )}
        </PmSection>

        <PmSection index={2} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Linked Work Items</h2>
              <Badge variant="secondary" className="text-micro">
                {detail.links.length}
              </Badge>
            </div>
            {canManage ? <AddLinkButton onClick={handleOpenAddLink} /> : null}
          </div>
          {detail.links.length === 0 ? (
            <PmPanel className="flex items-center justify-center p-4">
              <EmptyState
                illustration={<EmptyActivityIllustration />}
                compact
                title="No linked work"
                description="Connect projects or tickets that contribute to this goal."
              />
            </PmPanel>
          ) : (
            <PmPanel>
              {detail.links.map((link) => (
                <LinkRow
                  key={link.id}
                  link={link}
                  onRemove={handleRemoveLink}
                  canManage={canManage}
                />
              ))}
            </PmPanel>
          )}
        </PmSection>

        <PmSection index={3} className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Updates Timeline</h2>
          </div>
          {detail.updates.length === 0 ? (
            <PmPanel className="flex items-center justify-center p-4">
              <EmptyState
                illustration={<EmptyActivityIllustration />}
                compact
                title="No updates yet"
                description="Check-ins on key results will appear here."
              />
            </PmPanel>
          ) : (
            <PmPanel className="space-y-0 p-3">
              {detail.updates.map((update) => (
                <div key={update.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
                    <div className="w-px flex-1 bg-border" />
                  </div>
                  <div className="min-w-0 pb-3">
                    <p className={cn(TEXT_BODY, "text-sm")}>
                      <span className="font-medium">{update.userName ?? "Someone"}</span>
                      {update.previousValue !== null && update.newValue !== null ? (
                        <>
                          {" updated a key result from "}
                          <span className="font-medium tabular-nums">{update.previousValue}</span>
                          {" to "}
                          <span className="font-medium tabular-nums">{update.newValue}</span>
                        </>
                      ) : (
                        " posted an update"
                      )}
                    </p>
                    {update.note ? (
                      <p className={cn(TEXT_BODY, "mt-0.5 text-xs text-muted-foreground")}>
                        {update.note}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-dense text-muted-foreground">
                      {formatDistanceToNow(new Date(update.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </PmPanel>
          )}
        </PmSection>
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
        description={`“${detail.title}” and all its key results, updates, and links will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        isPending={deleteGoal.isPending}
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
