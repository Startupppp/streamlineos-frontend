"use client";

import { useCallback, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useCan } from "@/hooks/api/access";
import {
  AiFieldTrigger,
  AiFieldPopoverAction,
  AI_FIELD_POPOVER_COLLISION_PADDING,
  AI_FIELD_POPOVER_CONTENT_CLASS,
  AiInlinePreview,
  useAiInlineAction,
  type AiActionResult,
  type AiInlineSession,
} from "@/components/ai";
import {
  AiActionResultBody,
  AiActionResultFooter,
} from "@/components/ai/ai-action-result-body";
import {
  AiFieldPopoverFooter,
  AiFieldPopoverLayout,
  AiFieldPopoverScrollBody,
} from "@/components/ai/ai-field-popover-layout";
import { useAiPopoverAction } from "@/components/ai/use-ai-popover-action";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateTicket } from "@/hooks/api/build/tickets";
import {
  useCreateChecklist,
  useCreateChecklistItem,
} from "@/hooks/api/build/checklists";
import {
  useTicketAiSummarize,
  useTicketAiSummarizeComments,
  useTicketAiImproveDescription,
  useTicketAiSuggestSubtasks,
  useTicketAiGenerateChecklist,
  useTicketHandoff,
  type TicketCommentsSummaryResult,
  type TicketSummaryResult,
} from "@/hooks/api/build/ticket-ai";
import type { TicketHandoffResult } from "@/types/projects/ai";
import type { Ticket } from "@/types/projects";

function getPlainText(value: string | null | undefined): string {
  return (value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function formatTicketSummary(data: TicketSummaryResult): AiActionResult {
  const lines: string[] = [data.summary];
  if (data.keyPoints.length > 0) {
    lines.push("", "Key points:");
    for (const point of data.keyPoints) lines.push(`• ${point}`);
  }
  if (data.blockers.length > 0) {
    lines.push("", "Blockers:");
    for (const blocker of data.blockers) lines.push(`• ${blocker}`);
  }
  return { text: lines.join("\n").trimEnd() };
}

function formatCommentsSummary(data: TicketCommentsSummaryResult): AiActionResult {
  const lines: string[] = [data.summary];
  if (data.themes.length > 0) {
    lines.push("", "Themes:");
    for (const theme of data.themes) lines.push(`• ${theme}`);
  }
  if (data.openQuestions.length > 0) {
    lines.push("", "Open questions:");
    for (const question of data.openQuestions) lines.push(`• ${question}`);
  }
  return { text: lines.join("\n").trimEnd() };
}

function formatHandoff(data: TicketHandoffResult): AiActionResult {
  const lines: string[] = [data.currentState];
  if (data.keyDecisions.length > 0) {
    lines.push("", "Key decisions:");
    for (const decision of data.keyDecisions) lines.push(`• ${decision}`);
  }
  lines.push("", `Next action: ${data.nextAction}`);
  if (data.blockers.length > 0) {
    lines.push("", "Blockers:");
    for (const blocker of data.blockers) lines.push(`• ${blocker}`);
  }
  const citations = data.citations.map((citation, index) => ({
    id: index,
    title: citation.excerpt,
  }));
  return {
    text: lines.join("\n").trimEnd(),
    citations: citations.length > 0 ? citations : undefined,
  };
}

interface UseTicketDetailAiOptions {
  projectId: number;
  ticketId: number;
  ticket: Ticket;
  localTitle: string;
  commentCount: number;
  onApplyDescription: (html: string) => void;
}

export function useTicketDetailAi({
  projectId,
  ticketId,
  ticket,
  localTitle,
  commentCount,
  onApplyDescription,
}: UseTicketDetailAiOptions) {
  const canUseAI = useCan("build:ai:use");
  const [descriptionInlineSession, setDescriptionInlineSession] =
    useState<AiInlineSession | null>(null);

  const summarizeMutation = useTicketAiSummarize(projectId, ticketId);
  const summarizeCommentsMutation = useTicketAiSummarizeComments(projectId, ticketId);
  const improveMutation = useTicketAiImproveDescription(projectId, ticketId);
  const handoffMutation = useTicketHandoff(projectId, ticketId);

  const titlePlain = localTitle.trim();
  const descriptionPlain = getPlainText(ticket.description);

  const summarizeDisabledReason =
    titlePlain.length === 0 && descriptionPlain.length === 0 && commentCount === 0
      ? "Add a title, description, or comment first"
      : undefined;

  const improveDescriptionDisabledReason =
    titlePlain.length === 0 && descriptionPlain.length === 0
      ? "Add a title or description first"
      : undefined;

  const generateChecklistDisabledReason = improveDescriptionDisabledReason;

  const summarizeCommentsDisabledReason =
    commentCount === 0 ? "Add a comment first" : undefined;

  const runSummarize = useCallback((): Promise<AiActionResult> => {
    return summarizeMutation.mutateAsync(undefined).then(formatTicketSummary);
  }, [summarizeMutation]);

  const runSummarizeComments = useCallback((): Promise<AiActionResult> => {
    return summarizeCommentsMutation.mutateAsync(undefined).then(formatCommentsSummary);
  }, [summarizeCommentsMutation]);

  const runImprove = useCallback((): Promise<AiActionResult> => {
    return improveMutation
      .mutateAsync({ draft: ticket.description ?? undefined })
      .then((data) => ({ text: data.description }));
  }, [improveMutation, ticket.description]);

  const runHandoff = useCallback((): Promise<AiActionResult> => {
    return handoffMutation.mutateAsync(undefined).then(formatHandoff);
  }, [handoffMutation]);

  const descriptionAction = useAiInlineAction({
    actionKey: "improve-description",
    run: runImprove,
    onApply: onApplyDescription,
    onSessionChange: setDescriptionInlineSession,
  });

  return useMemo(
    () => ({
      canUseAI,
      summarizeDisabledReason,
      improveDescriptionDisabledReason,
      generateChecklistDisabledReason,
      summarizeCommentsDisabledReason,
      runSummarize,
      runSummarizeComments,
      runHandoff,
      descriptionInlineSession,
      descriptionTrigger: {
        label: "Improve",
        showLabel: true,
        disabledReason: improveDescriptionDisabledReason,
        isPending: descriptionAction.isPending || improveMutation.isPending,
        onClick: descriptionAction.run,
      },
    }),
    [
      canUseAI,
      summarizeDisabledReason,
      improveDescriptionDisabledReason,
      generateChecklistDisabledReason,
      summarizeCommentsDisabledReason,
      runSummarize,
      runSummarizeComments,
      runHandoff,
      descriptionInlineSession,
      descriptionAction.isPending,
      descriptionAction.run,
      improveMutation.isPending,
    ],
  );
}

interface TicketDetailAiDescriptionProps {
  canUseAI: boolean;
  summarizeDisabledReason?: string;
  runSummarize: () => Promise<AiActionResult>;
  descriptionTrigger: {
    label: string;
    showLabel?: boolean;
    disabledReason?: string;
    isPending: boolean;
    onClick: () => void;
  };
  descriptionInlineSession: AiInlineSession | null;
}

export function TicketDetailAiDescription({
  canUseAI,
  summarizeDisabledReason,
  runSummarize,
  descriptionTrigger,
  descriptionInlineSession,
}: TicketDetailAiDescriptionProps) {
  if (!canUseAI) return null;

  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Description
        </h3>
        <div className="flex items-center gap-1">
          <AiFieldPopoverAction
            label="Summarize"
            showLabel
            popoverTitle="Ticket summary"
            disabledReason={summarizeDisabledReason}
            run={runSummarize}
          />
          <AiFieldTrigger {...descriptionTrigger} />
        </div>
      </div>
      {descriptionInlineSession ? (
        <AiInlinePreview
          session={descriptionInlineSession}
          applyLabel="Replace"
          previewMode="description"
          className="mb-2"
        />
      ) : null}
    </>
  );
}

interface TicketDetailAiActivityProps {
  canUseAI: boolean;
  summarizeCommentsDisabledReason?: string;
  runSummarizeComments: () => Promise<AiActionResult>;
  runHandoff: () => Promise<AiActionResult>;
}

export function TicketDetailAiActivityActions({
  canUseAI,
  summarizeCommentsDisabledReason,
  runSummarizeComments,
  runHandoff,
}: TicketDetailAiActivityProps) {
  if (!canUseAI) return null;

  return (
    <div className="ml-auto flex items-center gap-1">
      <AiFieldPopoverAction
        label="Summarize comments"
        showLabel
        popoverTitle="Comments summary"
        disabledReason={summarizeCommentsDisabledReason}
        run={runSummarizeComments}
      />
      <AiFieldPopoverAction
        label="Handoff"
        showLabel
        popoverTitle="Handoff brief"
        run={runHandoff}
      />
    </div>
  );
}

interface TicketAiSuggestSubtasksActionProps {
  projectId: number;
  ticketId: number;
  canUseAI: boolean;
}

export function TicketAiSuggestSubtasksAction({
  projectId,
  ticketId,
  canUseAI,
}: TicketAiSuggestSubtasksActionProps) {
  const suggestMutation = useTicketAiSuggestSubtasks(projectId, ticketId);
  const createMutation = useCreateTicket();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [creatingCount, setCreatingCount] = useState(0);

  const popover = useAiPopoverAction({
    run: useCallback(async (): Promise<AiActionResult> => {
      const data = await suggestMutation.mutateAsync(undefined);
      setSelected(new Set(data.subtasks.map((_, index) => index)));
      if (data.subtasks.length === 0) {
        return { text: "No subtask suggestions at this time." };
      }
      return {
        text: data.subtasks.map((subtask, index) => `${index + 1}. ${subtask.title}`).join("\n"),
      };
    }, [suggestMutation]),
  });

  const subtasks = suggestMutation.data?.subtasks ?? [];
  const isCreating = creatingCount > 0 && createMutation.isPending;
  const hasSelectableSubtasks =
    popover.state.status === "ready" && subtasks.length > 0;

  const handleTriggerClick = useCallback(() => {
    if (popover.isPending) return;
    void popover.execute();
  }, [popover]);

  const handleToggle = useCallback((index: number) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  function handleCreateSelected() {
    const availableSubtasks = suggestMutation.data?.subtasks ?? [];
    const toCreate = Array.from(selected)
      .sort((a, b) => a - b)
      .map((index) => availableSubtasks[index])
      .filter((subtask): subtask is NonNullable<typeof subtask> => subtask !== undefined);

    if (toCreate.length === 0) return;

    setCreatingCount(toCreate.length);
    let done = 0;
    let failed = 0;

    for (const subtask of toCreate) {
      createMutation.mutate(
        {
          projectId,
          title: subtask.title,
          type: "TASK",
          parentTicketId: ticketId,
        },
        {
          onSuccess: () => {
            done += 1;
            if (done + failed === toCreate.length) {
              if (failed === 0) {
                toast.success(`${done} subtask${done !== 1 ? "s" : ""} created`);
              } else {
                toast.warning(`${done} created, ${failed} failed`);
              }
              popover.handleOpenChange(false);
              setSelected(new Set());
              suggestMutation.reset();
              setCreatingCount(0);
            }
          },
          onError: (error) => {
            failed += 1;
            if (done + failed === toCreate.length) {
              toast.error(getErrorMessage(error));
              setCreatingCount(0);
            }
          },
        },
      );
    }
  }

  if (!canUseAI) return null;

  return (
    <ResponsivePopover open={popover.open} onOpenChange={popover.handleOpenChange}>
      <ResponsivePopoverTrigger asChild>
        <span className="ml-auto inline-flex shrink-0">
          <AiFieldTrigger
            label="Suggest subtasks"
            showLabel
            isPending={popover.isPending || suggestMutation.isPending}
            onClick={handleTriggerClick}
          />
        </span>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        title="Suggested subtasks"
        align="end"
        collisionPadding={AI_FIELD_POPOVER_COLLISION_PADDING}
        className={AI_FIELD_POPOVER_CONTENT_CLASS}
        stickyFooter
      >
        <AiFieldPopoverLayout>
          {popover.state.status === "loading" || suggestMutation.isPending ? (
            <AiFieldPopoverScrollBody>
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-full rounded" />
                ))}
              </div>
            </AiFieldPopoverScrollBody>
          ) : hasSelectableSubtasks ? (
            <>
              <AiFieldPopoverScrollBody>
                <ul className="space-y-1.5">
                  {subtasks.map((subtask, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() => handleToggle(index)}
                        className={[
                          "flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-[13px] transition-colors",
                          selected.has(index)
                            ? "border-primary/20 bg-primary/10 text-foreground"
                            : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            selected.has(index)
                              ? "border-primary bg-primary"
                              : "border-border bg-background",
                          ].join(" ")}
                        >
                          {selected.has(index) ? (
                            <Check className="h-2.5 w-2.5 text-primary-foreground" />
                          ) : null}
                        </span>
                        {subtask.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </AiFieldPopoverScrollBody>
              <AiFieldPopoverFooter>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => popover.handleOpenChange(false)}
                  disabled={isCreating}
                  className="h-8 w-full text-xs"
                >
                  Dismiss
                </Button>
                <LoadingButton
                  size="sm"
                  isPending={isCreating}
                  loadingText="Creating…"
                  onClick={handleCreateSelected}
                  disabled={selected.size === 0}
                  className="h-8 w-full text-xs"
                >
                  Create {selected.size > 0 ? selected.size : ""} subtask
                  {selected.size !== 1 ? "s" : ""}
                </LoadingButton>
              </AiFieldPopoverFooter>
            </>
          ) : (
            <>
              <AiFieldPopoverScrollBody>
                <AiActionResultBody
                  state={popover.state}
                  contentOnly
                  compact
                />
              </AiFieldPopoverScrollBody>
              <AiActionResultFooter
                state={popover.state}
                onRetry={popover.retry}
              />
            </>
          )}
        </AiFieldPopoverLayout>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}

interface TicketAiGenerateChecklistActionProps {
  projectId: number;
  ticketId: number;
  canUseAI: boolean;
  disabledReason?: string;
}

export function TicketAiGenerateChecklistAction({
  projectId,
  ticketId,
  canUseAI,
  disabledReason,
}: TicketAiGenerateChecklistActionProps) {
  const generateMutation = useTicketAiGenerateChecklist(projectId, ticketId);
  const createChecklist = useCreateChecklist(projectId, ticketId);
  const createItem = useCreateChecklistItem(projectId, ticketId);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  const popover = useAiPopoverAction({
    run: useCallback(async (): Promise<AiActionResult> => {
      const data = await generateMutation.mutateAsync(undefined);
      setSelected(new Set(data.items.map((_, index) => index)));
      if (data.items.length === 0) {
        return { text: "No checklist items suggested at this time." };
      }
      const lines = [`${data.title}`, "", ...data.items.map((item, index) => `${index + 1}. ${item.text}`)];
      return { text: lines.join("\n") };
    }, [generateMutation]),
  });

  const generated = generateMutation.data;
  const items = generated?.items ?? [];
  const hasSelectableItems = popover.state.status === "ready" && items.length > 0;

  const handleTriggerClick = useCallback(() => {
    if (popover.isPending || disabledReason) return;
    void popover.execute();
  }, [popover, disabledReason]);

  const handleToggle = useCallback((index: number) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  async function handleCreateSelected() {
    if (!generated || selected.size === 0) return;

    const itemsToCreate = Array.from(selected)
      .sort((a, b) => a - b)
      .map((index) => generated.items[index])
      .filter((item): item is NonNullable<typeof item> => item !== undefined);

    if (itemsToCreate.length === 0) return;

    setIsCreating(true);
    try {
      const checklist = await createChecklist.mutateAsync(generated.title);
      await Promise.all(
        itemsToCreate.map((item, order) =>
          createItem.mutateAsync({
            checklistId: checklist.id,
            text: item.text,
            order,
          }),
        ),
      );
      toast.success(
        `Checklist created with ${itemsToCreate.length} item${itemsToCreate.length !== 1 ? "s" : ""}`,
      );
      popover.handleOpenChange(false);
      setSelected(new Set());
      generateMutation.reset();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  }

  if (!canUseAI) return null;

  return (
    <ResponsivePopover open={popover.open} onOpenChange={popover.handleOpenChange}>
      <ResponsivePopoverTrigger asChild>
        <span className="ml-auto inline-flex shrink-0">
          <AiFieldTrigger
            label="Generate checklist"
            showLabel
            disabledReason={disabledReason}
            isPending={popover.isPending || generateMutation.isPending}
            onClick={handleTriggerClick}
          />
        </span>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        title="Suggested checklist"
        align="end"
        collisionPadding={AI_FIELD_POPOVER_COLLISION_PADDING}
        className={AI_FIELD_POPOVER_CONTENT_CLASS}
        stickyFooter
      >
        <AiFieldPopoverLayout>
          {popover.state.status === "loading" || generateMutation.isPending ? (
            <AiFieldPopoverScrollBody>
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-full rounded" />
                ))}
              </div>
            </AiFieldPopoverScrollBody>
          ) : hasSelectableItems && generated ? (
            <>
              <AiFieldPopoverScrollBody>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">{generated.title}</p>
                  <ul className="space-y-1.5">
                    {items.map((item, index) => (
                      <li key={index}>
                        <button
                          type="button"
                          onClick={() => handleToggle(index)}
                          className={[
                            "flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-[13px] transition-colors",
                            selected.has(index)
                              ? "border-primary/20 bg-primary/10 text-foreground"
                              : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                              selected.has(index)
                                ? "border-primary bg-primary"
                                : "border-border bg-background",
                            ].join(" ")}
                          >
                            {selected.has(index) ? (
                              <Check className="h-2.5 w-2.5 text-primary-foreground" />
                            ) : null}
                          </span>
                          {item.text}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </AiFieldPopoverScrollBody>
              <AiFieldPopoverFooter>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => popover.handleOpenChange(false)}
                  disabled={isCreating}
                  className="h-8 w-full text-xs"
                >
                  Dismiss
                </Button>
                <LoadingButton
                  size="sm"
                  isPending={isCreating}
                  loadingText="Creating…"
                  onClick={() => void handleCreateSelected()}
                  disabled={selected.size === 0}
                  className="h-8 w-full text-xs"
                >
                  Create checklist
                </LoadingButton>
              </AiFieldPopoverFooter>
            </>
          ) : (
            <>
              <AiFieldPopoverScrollBody>
                <AiActionResultBody
                  state={popover.state}
                  contentOnly
                  compact
                />
              </AiFieldPopoverScrollBody>
              <AiActionResultFooter
                state={popover.state}
                onRetry={popover.retry}
              />
            </>
          )}
        </AiFieldPopoverLayout>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
