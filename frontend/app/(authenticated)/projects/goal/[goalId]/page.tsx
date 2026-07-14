"use client";

import { use, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  EmptyTasksIllustration,
  EmptyActivityIllustration,
} from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import {
  Pencil,
  Trash2,
  ListChecks,
  Plus,
  History,
  Link2,
  CalendarDays,
  Users,
  Ticket as TicketIcon,
  FolderKanban,
  X,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  useGoal,
  useDeleteGoal,
  useCheckIn,
  useAddGoalLink,
  useRemoveGoalLink,
  type KeyResult,
  type GoalDetail,
} from "@/hooks/api/goals";
import { useProjects, useTickets } from "@/hooks/api/projects";
import { GoalFormSheet } from "@/features/projects/goals/goal-form-sheet";
import {
  STATUS_CONFIG,
  LEVEL_LABEL,
  keyResultPercent,
  formatMetricValue,
} from "@/features/projects/goals/constants";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_PANEL,
  PM_ROW,
} from "@/features/projects/shared/pm-chrome";
import { TEXT_ONE_LINE, TEXT_BODY } from "@/features/projects/shared/text-overflow";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

function CheckInDialog({
  goalId,
  keyResult,
  onClose,
}: {
  goalId: number;
  keyResult: KeyResult;
  onClose: () => void;
}) {
  const [newValue, setNewValue] = useState(keyResult.currentValue);
  const [note, setNote] = useState("");
  const checkIn = useCheckIn(goalId);

  function handleNewValueChange(e: ChangeEvent<HTMLInputElement>) {
    setNewValue(e.target.value);
  }

  function handleNoteChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setNote(e.target.value);
  }

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  function handleSubmit() {
    const parsed = Number(newValue);
    if (Number.isNaN(parsed)) {
      toast.error("Enter a valid number");
      return;
    }
    checkIn.mutate(
      { keyResultId: keyResult.id, newValue: parsed, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Check-in recorded");
          onClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={TEXT_ONE_LINE}>Check in — {keyResult.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="check-in-value">New current value</Label>
            <Input
              id="check-in-value"
              type="number"
              value={newValue}
              onChange={handleNewValueChange}
            />
            <p className="text-xs text-muted-foreground">
              Target:{" "}
              {formatMetricValue(keyResult.targetValue, keyResult.metricType, keyResult.unit)}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="check-in-note">Note (optional)</Label>
            <Textarea
              id="check-in-note"
              rows={2}
              className="resize-none"
              value={note}
              onChange={handleNoteChange}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <LoadingButton onClick={handleSubmit} isPending={checkIn.isPending} loadingText="Saving…">
            Record Check-in
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddLinkDialog({ goalId, onClose }: { goalId: number; onClose: () => void }) {
  const [projectId, setProjectId] = useState<string>("");
  const [ticketId, setTicketId] = useState<string>("");
  const { data: projectsData } = useProjects();
  const numericProjectId = projectId ? Number(projectId) : 0;
  const { data: ticketsData } = useTickets(numericProjectId);
  const addLink = useAddGoalLink(goalId);

  function handleProjectChange(v: string) {
    setProjectId(v);
    setTicketId("");
  }

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  function handleSubmit() {
    if (!projectId) {
      toast.error("Select a project");
      return;
    }
    const payload = ticketId
      ? { ticketId: Number(ticketId) }
      : { projectId: Number(projectId) };
    addLink.mutate(payload, {
      onSuccess: () => {
        toast.success("Work item linked");
        onClose();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link work item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={handleProjectChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projectsData?.data.map((project) => (
                  <SelectItem key={project.id} value={String(project.id)}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Ticket (optional)</Label>
            <Select value={ticketId} onValueChange={setTicketId} disabled={!projectId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Link the whole project" />
              </SelectTrigger>
              <SelectContent>
                {ticketsData?.data.map((ticket) => (
                  <SelectItem key={ticket.id} value={String(ticket.id)}>
                    {ticket.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleSubmit}
            disabled={!projectId}
            isPending={addLink.isPending}
            loadingText="Linking…"
          >
            Link
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KeyResultRow({
  keyResult,
  onCheckIn,
}: {
  keyResult: KeyResult;
  onCheckIn: (keyResult: KeyResult) => void;
}) {
  const percent = keyResultPercent(keyResult);

  function handleCheckIn() {
    onCheckIn(keyResult);
  }

  return (
    <div className={cn(PM_PANEL, "space-y-2 p-3")}>
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className={cn(TEXT_ONE_LINE, "text-sm font-medium")} title={keyResult.title}>
          {keyResult.title}
        </p>
        <Button size="sm" variant="outline" className="h-7 shrink-0" onClick={handleCheckIn}>
          Check in
        </Button>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatMetricValue(keyResult.currentValue, keyResult.metricType, keyResult.unit)}
            {" / "}
            {formatMetricValue(keyResult.targetValue, keyResult.metricType, keyResult.unit)}
          </span>
          <span className="tabular-nums">{percent}%</span>
        </div>
        <Progress value={percent} className="h-1.5" />
      </div>
    </div>
  );
}

function LinkRow({
  link,
  onRemove,
}: {
  link: GoalDetail["links"][number];
  onRemove: (id: number) => void;
}) {
  function handleRemove() {
    onRemove(link.id);
  }

  const label = link.ticketId
    ? (link.ticketTitle ?? `Ticket #${link.ticketId}`)
    : (link.projectName ?? `Project #${link.projectId}`);

  return (
    <div className={cn(PM_ROW, "rounded-lg border border-border/50 last:border-b")}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {link.ticketId ? (
          <TicketIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <FolderKanban className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className={cn(TEXT_ONE_LINE, "text-sm")} title={label}>
          {label}
        </span>
        {link.ticketId && link.projectKey ? (
          <Badge variant="outline" className="shrink-0 text-[9px]">
            {link.projectKey}
          </Badge>
        ) : null}
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={handleRemove}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function GoalDetailSkeleton() {
  return (
    <PmPageShell>
      <div className={cn(PM_PANEL, "space-y-3 p-4")}>
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </PmPageShell>
  );
}

export default function GoalDetailPage({ params }: { params: Promise<{ goalId: string }> }) {
  const { goalId: goalIdStr } = use(params);
  const goalId = Number(goalIdStr);
  const router = useRouter();

  const { data: goal, isLoading, isError, refetch } = useGoal(goalId);
  const deleteGoal = useDeleteGoal();
  const removeLink = useRemoveGoalLink(goalId);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [checkInTarget, setCheckInTarget] = useState<KeyResult | null>(null);
  const [addLinkOpen, setAddLinkOpen] = useState(false);

  function handleOpenEdit() {
    setEditOpen(true);
  }

  function handleOpenDelete() {
    setDeleteOpen(true);
  }

  function handleOpenAddLink() {
    setAddLinkOpen(true);
  }

  function handleCloseAddLink() {
    setAddLinkOpen(false);
  }

  function handleCloseCheckIn() {
    setCheckInTarget(null);
  }

  function handleCheckIn(kr: KeyResult) {
    setCheckInTarget(kr);
  }

  function handleRetry() {
    void refetch();
  }

  function handleDelete() {
    deleteGoal.mutate(goalId, {
      onSuccess: () => {
        toast.success("Goal deleted");
        router.push("/projects/goal");
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

  if (isLoading) {
    return (
      <PageWrapper title="Goal" eyebrow="Goals" backHref="/projects/goal">
        <GoalDetailSkeleton />
      </PageWrapper>
    );
  }

  if (isError || !goal) {
    return (
      <PageWrapper title="Goal" eyebrow="Goals" backHref="/projects/goal">
        <PmPageShell withGlow={false}>
          <PmPanel className="flex min-h-[14rem] items-center justify-center p-6">
            <ErrorState
              title="Failed to load goal"
              description="This goal may have been removed or is unavailable."
              onRetry={handleRetry}
            />
          </PmPanel>
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
      eyebrow={LEVEL_LABEL[detail.level]}
      backHref="/projects/goal"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenEdit}>
            <Pencil className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleOpenDelete}
          >
            <Trash2 className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      }
    >
      <PmPageShell>
        <PmSection index={0}>
          <PmPanel className="space-y-3 p-4">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <Badge variant={cfg.variant}>{cfg.label}</Badge>
              <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span className={TEXT_ONE_LINE}>{ownerName}</span>
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
                  <span className={TEXT_ONE_LINE}>{detail.project.name}</span>
                </span>
              ) : null}
            </div>
          </PmPanel>
        </PmSection>

        <PmSection index={1} className="space-y-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Key Results</h2>
            <Badge variant="secondary" className="text-[10px]">
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
                <KeyResultRow key={kr.id} keyResult={kr} onCheckIn={handleCheckIn} />
              ))}
            </div>
          )}
        </PmSection>

        <PmSection index={2} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Linked Work Items</h2>
              <Badge variant="secondary" className="text-[10px]">
                {detail.links.length}
              </Badge>
            </div>
            <Button size="sm" variant="outline" className="h-7" onClick={handleOpenAddLink}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Link
            </Button>
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
                <LinkRow key={link.id} link={link} onRemove={handleRemoveLink} />
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
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
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
      {checkInTarget ? (
        <CheckInDialog
          goalId={goalId}
          keyResult={checkInTarget}
          onClose={handleCloseCheckIn}
        />
      ) : null}
      {addLinkOpen ? <AddLinkDialog goalId={goalId} onClose={handleCloseAddLink} /> : null}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete goal?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{detail.title}&rdquo; and all its key results, updates, and links will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {deleteGoal.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
