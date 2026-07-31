"use client";

import { useCallback, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import {
  AiFieldTrigger,
  AI_FIELD_POPOVER_COLLISION_PADDING,
  AI_FIELD_POPOVER_CONTENT_CLASS,
  type AiActionResult,
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
import { useTicketAiSuggestSubtasks } from "@/hooks/api/build/ticket-ai";

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
