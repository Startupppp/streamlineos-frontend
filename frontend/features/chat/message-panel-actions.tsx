"use client";

import type { ReactNode, RefObject } from "react";
import { Bookmark, Sparkles } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AiActionResultBody, type AiAction } from "@/components/ai";
import { useAiPopoverAction } from "@/components/ai/use-ai-popover-action";

interface ConversationOverflowMenuProps {
  canUseAi: boolean;
  summarizeAction: AiAction;
  onOpenSaved: () => void;
  triggerClassName: string;
  triggerRef?: RefObject<HTMLButtonElement | null>;
  children?: ReactNode;
}

export function ConversationOverflowMenu({
  canUseAi,
  summarizeAction,
  onOpenSaved,
  triggerClassName,
  triggerRef,
  children,
}: ConversationOverflowMenuProps) {
  const summary = useAiPopoverAction({ run: summarizeAction.run });

  function handleSummarize() {
    if (summary.isPending || summarizeAction.disabledReason) return;
    void summary.execute();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <AnimatedIconButton
            ref={triggerRef}
            type="button"
            icon={EllipsisIcon}
            iconSize={16}
            variant="ghost"
            className={triggerClassName}
            aria-label="More conversation actions"
          >
            {children}
          </AnimatedIconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={onOpenSaved}>
            <Bookmark />
            Saved messages
          </DropdownMenuItem>
          {canUseAi ? (
            <DropdownMenuItem
              onSelect={handleSummarize}
              disabled={summary.isPending || Boolean(summarizeAction.disabledReason)}
            >
              <Sparkles className="text-primary" />
              <span className="flex min-w-0 flex-col">
                <span>{summarizeAction.label}</span>
                {summarizeAction.disabledReason ? (
                  <span className="text-dense text-muted-foreground">
                    {summarizeAction.disabledReason}
                  </span>
                ) : null}
              </span>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {canUseAi ? (
        <Sheet open={summary.open} onOpenChange={summary.handleOpenChange}>
          <SheetContent
            showCloseButton
            className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
          >
            <SheetHeader className="shrink-0 space-y-1.5 border-b border-border/40 px-5 py-4 pr-12 text-left">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Sparkles className="size-4 text-primary" aria-hidden />
                </div>
                <div className="min-w-0">
                  <SheetTitle className="text-base font-semibold tracking-tight">
                    {summarizeAction.label}
                  </SheetTitle>
                  <SheetDescription className="text-dense text-muted-foreground">
                    AI recap of key points, decisions, and next steps.
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-2">
              <AiActionResultBody
                state={summary.state}
                onRetry={summary.retry}
                onCancel={summary.cancel}
              />
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}
