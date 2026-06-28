"use client";

import { use, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  EmptyTasksIllustration,
  EmptyActivityIllustration,
} from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import {
  ArrowLeft,
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
} from "@/lib/api/hooks/goals";
import { useProjects, useTickets } from "@/lib/api/hooks/projects";
import { GoalFormSheet } from "@/features/projects/goals/goal-form-sheet";
import {
  STATUS_CONFIG,
  LEVEL_LABEL,
  keyResultPercent,
  formatMetricValue,
} from "@/features/projects/goals/constants";

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
        onError: () => toast.error("Failed to record check-in"),
      },
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Check in — {keyResult.title}</DialogTitle>
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
              Target: {formatMetricValue(keyResult.targetValue, keyResult.metricType, keyResult.unit)}
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
          <Button onClick={handleSubmit} disabled={checkIn.isPending}>
            {checkIn.isPending ? "Saving..." : "Record Check-in"}
          </Button>
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
      onError: () => toast.error("Failed to link work item"),
    });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link work item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select
              value={projectId}
              onValueChange={handleProjectChange}
            >
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
          <Button onClick={handleSubmit} disabled={addLink.isPending || !projectId}>
            {addLink.isPending ? "Linking..." : "Link"}
          </Button>
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
    <div className="rounded-lg border border-border/60 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{keyResult.title}</p>
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

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        {link.ticketId ? (
          <TicketIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <FolderKanban className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="text-sm truncate">
          {link.ticketId ? link.ticketTitle ?? `Ticket #${link.ticketId}` : link.projectName ?? `Project #${link.projectId}`}
        </span>
        {link.ticketId && link.projectKey && (
          <Badge variant="outline" className="text-[9px] shrink-0">
            {link.projectKey}
          </Badge>
        )}
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
        onClick={handleRemove}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
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

  function handleNavigateBack() {
    router.push("/goals");
  }

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
        router.push("/goals");
      },
      onError: () => toast.error("Failed to delete goal"),
    });
  }

  function handleRemoveLink(linkId: number) {
    removeLink.mutate(linkId, {
      onSuccess: () => toast.success("Link removed"),
      onError: () => toast.error("Failed to remove link"),
    });
  }

  if (isLoading) {
    return (
      <PageWrapper title="Goal">
        <LoadingState variant="page" />
      </PageWrapper>
    );
  }

  if (isError || !goal) {
    return (
      <PageWrapper title="Goal">
        <ErrorState
          title="Failed to load goal"
          description="This goal may have been removed or is unavailable."
          onRetry={handleRetry}
        />
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
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleNavigateBack}>
            <ArrowLeft className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Back</span>
          </Button>
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
      <div className="space-y-6 max-w-4xl">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Badge variant={cfg.variant}>{cfg.label}</Badge>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>{ownerName}</span>
              </div>
            </div>
            {detail.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{detail.description}</p>
            )}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Overall progress</span>
                <span className="tabular-nums">{detail.progress}%</span>
              </div>
              <Progress value={detail.progress} className="h-2" />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
              {detail.startDate && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Start {format(new Date(detail.startDate), "MMM d, yyyy")}
                </span>
              )}
              {detail.dueDate && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Due {format(new Date(detail.dueDate), "MMM d, yyyy")}
                </span>
              )}
              {detail.project && (
                <span className="flex items-center gap-1.5">
                  <FolderKanban className="h-3.5 w-3.5" />
                  {detail.project.name}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Key Results</h2>
            <Badge variant="secondary" className="text-[10px]">
              {detail.keyResults.length}
            </Badge>
          </div>
          {detail.keyResults.length === 0 ? (
            <EmptyState
              illustration={<EmptyTasksIllustration />}
              compact
              title="No key results"
              description="Edit this goal to add measurable key results."
            />
          ) : (
            <div className="space-y-2">
              {detail.keyResults.map((kr) => (
                <KeyResultRow key={kr.id} keyResult={kr} onCheckIn={handleCheckIn} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Linked Work Items</h2>
              <Badge variant="secondary" className="text-[10px]">
                {detail.links.length}
              </Badge>
            </div>
            <Button size="sm" variant="outline" className="h-7" onClick={handleOpenAddLink}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Link
            </Button>
          </div>
          {detail.links.length === 0 ? (
            <EmptyState
              illustration={<EmptyActivityIllustration />}
              compact
              title="No linked work"
              description="Connect projects or tickets that contribute to this goal."
            />
          ) : (
            <div className="space-y-2">
              {detail.links.map((link) => (
                <LinkRow key={link.id} link={link} onRemove={handleRemoveLink} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Updates Timeline</h2>
          </div>
          {detail.updates.length === 0 ? (
            <EmptyState
              illustration={<EmptyActivityIllustration />}
              compact
              title="No updates yet"
              description="Check-ins on key results will appear here."
            />
          ) : (
            <div className="space-y-3">
              {detail.updates.map((update) => (
                <div key={update.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                    <div className="w-px flex-1 bg-border" />
                  </div>
                  <div className="pb-3 min-w-0">
                    <p className="text-sm">
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
                    {update.note && (
                      <p className="text-xs text-muted-foreground mt-0.5">{update.note}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(update.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {editOpen && <GoalFormSheet open={editOpen} onOpenChange={setEditOpen} goal={detail} />}
      {checkInTarget && (
        <CheckInDialog
          goalId={goalId}
          keyResult={checkInTarget}
          onClose={handleCloseCheckIn}
        />
      )}
      {addLinkOpen && <AddLinkDialog goalId={goalId} onClose={handleCloseAddLink} />}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete goal?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{detail.title}&rdquo; and all its key results, updates, and links will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
