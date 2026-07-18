"use client";

import { useState, useCallback } from "react";
import { RotateCcw, Check } from "lucide-react";
import { SparklesIcon, XIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  useTicketAiSummarize,
  useTicketAiImproveDescription,
  useTicketAiSuggestSubtasks,
  useTicketHandoff,
} from "@/hooks/api/projects/ticket-ai";
import { useUpdateTicket } from "@/hooks/api/projects";
import { useCreateTicket } from "@/hooks/api/projects/tickets";
import type { Ticket } from "@/types/projects";

interface TicketAiSectionProps {
  ticket: Ticket;
  ticketId: number;
  projectId: number;
}

interface SummarizeTriggerProps {
  onClick: () => void;
  isPending: boolean;
}

function SummarizeTrigger({ onClick, isPending }: SummarizeTriggerProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <LoadingButton
      size="sm"
      variant="outline"
      isPending={isPending}
      loadingText="Summarizing…"
      onClick={onClick}
      className="gap-1.5 text-xs border-border/60"
      {...hoverHandlers}
    >
      <SparklesIcon ref={iconRef} size={13} />
      Summarize
    </LoadingButton>
  );
}

interface ImproveDescTriggerProps {
  onClick: () => void;
  isPending: boolean;
}

function ImproveDescTrigger({ onClick, isPending }: ImproveDescTriggerProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <LoadingButton
      size="sm"
      variant="outline"
      isPending={isPending}
      loadingText="Improving…"
      onClick={onClick}
      className="gap-1.5 text-xs border-border/60"
      {...hoverHandlers}
    >
      <SparklesIcon ref={iconRef} size={13} />
      Improve description
    </LoadingButton>
  );
}

interface SuggestSubtasksTriggerProps {
  onClick: () => void;
  isPending: boolean;
}

function SuggestSubtasksTrigger({
  onClick,
  isPending,
}: SuggestSubtasksTriggerProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <LoadingButton
      size="sm"
      variant="outline"
      isPending={isPending}
      loadingText="Thinking…"
      onClick={onClick}
      className="gap-1.5 text-xs border-border/60"
      {...hoverHandlers}
    >
      <SparklesIcon ref={iconRef} size={13} />
      Suggest subtasks
    </LoadingButton>
  );
}

interface HandoffTriggerProps {
  onClick: () => void;
  isPending: boolean;
}

function HandoffTrigger({ onClick, isPending }: HandoffTriggerProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <LoadingButton
      size="sm"
      variant="outline"
      isPending={isPending}
      loadingText="Generating…"
      onClick={onClick}
      className="gap-1.5 text-xs border-border/60"
      {...hoverHandlers}
    >
      <SparklesIcon ref={iconRef} size={13} />
      Handoff brief
    </LoadingButton>
  );
}

interface HandoffPanelProps {
  currentState: string;
  keyDecisions: string[];
  nextAction: string;
  blockers: string[];
  onDismiss: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

function HandoffPanel({
  currentState,
  keyDecisions,
  nextAction,
  blockers,
  onDismiss,
  onRegenerate,
  isRegenerating,
}: HandoffPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-primary/5 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Handoff Brief
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            aria-label="Regenerate handoff brief"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onDismiss}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss handoff brief"
          >
            <XIcon size={12} />
          </Button>
        </div>
      </div>
      <p className="text-[13px] text-foreground leading-relaxed">{currentState}</p>
      {keyDecisions.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">Key decisions</p>
          <ul className="space-y-0.5">
            {keyDecisions.map((d, i) => (
              <li key={i} className="text-[12px] text-foreground/80 flex items-start gap-1.5">
                <span className="mt-2 h-1 w-1 rounded-full bg-primary shrink-0" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Next action</p>
        <p className="text-[12px] text-foreground/80">{nextAction}</p>
      </div>
      {blockers.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium text-destructive mb-1">Blockers</p>
          <ul className="space-y-0.5">
            {blockers.map((b, i) => (
              <li key={i} className="text-[12px] text-destructive/80 flex items-start gap-1.5">
                <span className="mt-2 h-1 w-1 rounded-full bg-destructive shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

interface SummaryPanelProps {
  summary: string;
  keyPoints: string[];
  blockers: string[];
  onDismiss: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

function SummaryPanel({
  summary,
  keyPoints,
  blockers,
  onDismiss,
  onRegenerate,
  isRegenerating,
}: SummaryPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-primary/5 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          AI Summary
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            aria-label="Regenerate summary"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onDismiss}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss summary"
          >
            <XIcon size={12} />
          </Button>
        </div>
      </div>
      <p className="text-[13px] text-foreground leading-relaxed">{summary}</p>
      {keyPoints.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">
            Key points
          </p>
          <ul className="space-y-0.5">
            {keyPoints.map((point, i) => (
              <li
                key={i}
                className="text-[12px] text-foreground/80 flex items-start gap-1.5"
              >
                <span className="mt-2 h-1 w-1 rounded-full bg-primary shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
      {blockers.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-destructive mb-1">
            Blockers
          </p>
          <ul className="space-y-0.5">
            {blockers.map((blocker, i) => (
              <li
                key={i}
                className="text-[12px] text-destructive/80 flex items-start gap-1.5"
              >
                <span className="mt-2 h-1 w-1 rounded-full bg-destructive shrink-0" />
                {blocker}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface ImproveDescDialogProps {
  open: boolean;
  proposed: string;
  isPending: boolean;
  isApplying: boolean;
  onApply: () => void;
  onDiscard: () => void;
}

function ImproveDescDialog({
  open,
  proposed,
  isPending,
  isApplying,
  onApply,
  onDiscard,
}: ImproveDescDialogProps) {
  function handleOpenChange(v: boolean) {
    if (!v) onDiscard();
  }
  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="flex max-h-[min(80dvh,calc(100dvh-100px))] max-w-2xl flex-col gap-0 overflow-hidden p-0 pb-0 md:!flex md:grid-cols-none md:max-w-2xl md:overflow-hidden md:pb-0 md:sm:max-w-2xl">
        <DialogHeader className="shrink-0 gap-1 border-b border-border px-5 pb-2 pt-4 text-left">
          <DialogTitle className="text-sm font-semibold">
            Improved Description
          </DialogTitle>
          <p className="text-[12px] text-muted-foreground">
            Review the AI-generated description. Apply to replace the current
            one, or discard.
          </p>
        </DialogHeader>

        <DialogBody className="px-5 py-4">
          {isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-full rounded" />
              <Skeleton className="h-3.5 w-5/6 rounded" />
              <Skeleton className="h-3.5 w-4/5 rounded" />
              <Skeleton className="h-3.5 w-full rounded" />
              <Skeleton className="h-3.5 w-3/4 rounded" />
            </div>
          ) : (
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-[13px]"
              dangerouslySetInnerHTML={{ __html: proposed }}
            />
          )}
        </DialogBody>

        <DialogFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border px-5 pt-3 pb-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onDiscard}
            disabled={isApplying}
          >
            Discard
          </Button>
          <LoadingButton
            size="sm"
            isPending={isApplying}
            loadingText="Applying…"
            onClick={onApply}
            disabled={isPending || isApplying}
            className="gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            Apply
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SubtaskSuggestionsDialogProps {
  open: boolean;
  subtasks: string[];
  selected: Set<number>;
  isPending: boolean;
  isCreating: boolean;
  onToggle: (i: number) => void;
  onConfirm: () => void;
  onDiscard: () => void;
}

function SubtaskSuggestionsDialog({
  open,
  subtasks,
  selected,
  isPending,
  isCreating,
  onToggle,
  onConfirm,
  onDiscard,
}: SubtaskSuggestionsDialogProps) {
  function handleOpenChange(v: boolean) {
    if (!v) onDiscard();
  }
  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="max-w-md flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm font-semibold">
            Suggested Subtasks
          </DialogTitle>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Select the subtasks to create. Deselect any you don&apos;t need.
          </p>
        </DialogHeader>

        <DialogBody className="px-5 py-3">
          {isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full rounded" />
              ))}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {subtasks.map((title, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => onToggle(i)}
                    className={[
                      "w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] transition-colors",
                      selected.has(i)
                        ? "bg-primary/10 text-foreground border border-primary/20"
                        : "bg-muted/40 text-muted-foreground border border-transparent hover:bg-muted",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "shrink-0 h-4 w-4 rounded border flex items-center justify-center",
                        selected.has(i)
                          ? "bg-primary border-primary"
                          : "border-border bg-background",
                      ].join(" ")}
                    >
                      {selected.has(i) && (
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      )}
                    </span>
                    {title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogBody>

        <DialogFooter className="px-5 pt-3 pb-0 border-t border-border shrink-0 flex-row gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onDiscard}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <LoadingButton
            size="sm"
            isPending={isCreating}
            loadingText="Creating…"
            onClick={onConfirm}
            disabled={isPending || isCreating || selected.size === 0}
          >
            Create {selected.size > 0 ? `${selected.size} ` : ""}subtask
            {selected.size !== 1 ? "s" : ""}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TicketAiSection({
  ticket,
  ticketId,
  projectId,
}: TicketAiSectionProps) {
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [handoffVisible, setHandoffVisible] = useState(false);
  const [improveOpen, setImproveOpen] = useState(false);
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const [selectedSubtasks, setSelectedSubtasks] = useState<Set<number>>(
    new Set(),
  );
  const [creatingCount, setCreatingCount] = useState(0);

  const summarizeMutation = useTicketAiSummarize(projectId, ticketId);
  const handoffMutation = useTicketHandoff(projectId, ticketId);
  const improveMutation = useTicketAiImproveDescription(projectId, ticketId);
  const suggestMutation = useTicketAiSuggestSubtasks(projectId, ticketId);
  const updateMutation = useUpdateTicket(projectId);
  const createMutation = useCreateTicket();

  const handleSummarize = useCallback(() => {
    summarizeMutation.mutate(undefined, {
      onSuccess: () => setSummaryVisible(true),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [summarizeMutation]);

  const handleDismissSummary = useCallback(() => {
    setSummaryVisible(false);
  }, []);

  const handleHandoff = useCallback(() => {
    handoffMutation.mutate(undefined, {
      onSuccess: () => setHandoffVisible(true),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [handoffMutation]);

  const handleDismissHandoff = useCallback(() => {
    setHandoffVisible(false);
  }, []);

  const handleImprove = useCallback(() => {
    setImproveOpen(true);
    improveMutation.mutate(
      { draft: ticket.description ?? undefined },
      {
        onError: (err) => {
          toast.error(getErrorMessage(err));
          setImproveOpen(false);
        },
      },
    );
  }, [improveMutation, ticket.description]);

  const handleApplyDescription = useCallback(() => {
    if (!improveMutation.data) return;
    updateMutation.mutate(
      { ticketId, description: improveMutation.data.description },
      {
        onSuccess: () => {
          toast.success("Description updated");
          setImproveOpen(false);
          improveMutation.reset();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [improveMutation, updateMutation, ticketId]);

  const handleDiscardDescription = useCallback(() => {
    setImproveOpen(false);
    improveMutation.reset();
  }, [improveMutation]);

  const handleSuggestSubtasks = useCallback(() => {
    setSubtasksOpen(true);
    suggestMutation.mutate(undefined, {
      onSuccess: (data) => {
        setSelectedSubtasks(new Set(data.subtasks.map((_, i) => i)));
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
        setSubtasksOpen(false);
      },
    });
  }, [suggestMutation]);

  const handleToggleSubtask = useCallback((i: number) => {
    setSelectedSubtasks((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  }, []);

  const handleConfirmSubtasks = useCallback(() => {
    const subtasks = suggestMutation.data?.subtasks ?? [];
    const toCreate = Array.from(selectedSubtasks)
      .sort((a, b) => a - b)
      .map((i) => subtasks[i])
      .filter((s): s is NonNullable<typeof s> => s !== undefined);

    if (toCreate.length === 0) return;

    setCreatingCount(toCreate.length);
    let done = 0;
    let failed = 0;

    for (const sub of toCreate) {
      createMutation.mutate(
        { projectId, title: sub.title, type: "TASK", parentTicketId: ticketId },
        {
          onSuccess: () => {
            done += 1;
            if (done + failed === toCreate.length) {
              if (failed === 0) {
                toast.success(
                  `${done} subtask${done !== 1 ? "s" : ""} created`,
                );
              } else {
                toast.warning(`${done} created, ${failed} failed`);
              }
              setSubtasksOpen(false);
              setSelectedSubtasks(new Set());
              suggestMutation.reset();
              setCreatingCount(0);
            }
          },
          onError: (err) => {
            failed += 1;
            if (done + failed === toCreate.length) {
              toast.error(getErrorMessage(err));
              setCreatingCount(0);
            }
          },
        },
      );
    }
  }, [suggestMutation, selectedSubtasks, createMutation, projectId, ticketId]);

  const handleDiscardSubtasks = useCallback(() => {
    setSubtasksOpen(false);
    setSelectedSubtasks(new Set());
    suggestMutation.reset();
  }, [suggestMutation]);

  const isCreatingSubtasks = creatingCount > 0 && createMutation.isPending;

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          AI Assist
        </h3>

        <div className="flex flex-wrap gap-2">
          <SummarizeTrigger
            onClick={handleSummarize}
            isPending={summarizeMutation.isPending}
          />
          <ImproveDescTrigger
            onClick={handleImprove}
            isPending={improveMutation.isPending && !improveOpen}
          />
          <SuggestSubtasksTrigger
            onClick={handleSuggestSubtasks}
            isPending={suggestMutation.isPending && !subtasksOpen}
          />
          <HandoffTrigger
            onClick={handleHandoff}
            isPending={handoffMutation.isPending && !handoffVisible}
          />
        </div>

        {summaryVisible && summarizeMutation.data && (
          <SummaryPanel
            summary={summarizeMutation.data.summary}
            keyPoints={summarizeMutation.data.keyPoints}
            blockers={summarizeMutation.data.blockers}
            onDismiss={handleDismissSummary}
            onRegenerate={handleSummarize}
            isRegenerating={summarizeMutation.isPending}
          />
        )}

        {summarizeMutation.isPending && !summaryVisible && (
          <div className="rounded-lg border border-border bg-primary/5 p-3 space-y-2">
            <Skeleton className="h-3.5 w-full rounded" />
            <Skeleton className="h-3.5 w-4/5 rounded" />
            <Skeleton className="h-3.5 w-3/4 rounded" />
          </div>
        )}

        {handoffVisible && handoffMutation.data && (
          <HandoffPanel
            currentState={handoffMutation.data.currentState}
            keyDecisions={handoffMutation.data.keyDecisions}
            nextAction={handoffMutation.data.nextAction}
            blockers={handoffMutation.data.blockers}
            onDismiss={handleDismissHandoff}
            onRegenerate={handleHandoff}
            isRegenerating={handoffMutation.isPending}
          />
        )}

        {handoffMutation.isPending && !handoffVisible && (
          <div className="rounded-lg border border-border bg-primary/5 p-3 space-y-2">
            <Skeleton className="h-3.5 w-full rounded" />
            <Skeleton className="h-3.5 w-4/5 rounded" />
            <Skeleton className="h-3.5 w-3/4 rounded" />
          </div>
        )}
      </div>

      <ImproveDescDialog
        open={improveOpen}
        proposed={improveMutation.data?.description ?? ""}
        isPending={improveMutation.isPending}
        isApplying={updateMutation.isPending}
        onApply={handleApplyDescription}
        onDiscard={handleDiscardDescription}
      />

      <SubtaskSuggestionsDialog
        open={subtasksOpen}
        subtasks={suggestMutation.data?.subtasks.map((s) => s.title) ?? []}
        selected={selectedSubtasks}
        isPending={suggestMutation.isPending}
        isCreating={isCreatingSubtasks}
        onToggle={handleToggleSubtask}
        onConfirm={handleConfirmSubtasks}
        onDiscard={handleDiscardSubtasks}
      />
    </>
  );
}
