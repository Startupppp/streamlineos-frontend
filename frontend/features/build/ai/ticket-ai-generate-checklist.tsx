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
import {
  useCreateChecklist,
  useCreateChecklistItem,
} from "@/hooks/api/build/checklists";
import { useTicketAiGenerateChecklist } from "@/hooks/api/build/ticket-ai";

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
    run: useCallback(async (signal?: AbortSignal): Promise<AiActionResult> => {
      const data = await generateMutation.mutateAsync({ signal });
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
                            "flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-label transition-colors",
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
