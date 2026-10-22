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
          <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
            <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
              <SheetTitle className="text-base font-medium">{summarizeAction.label}</SheetTitle>
              <SheetDescription className="text-label text-muted-foreground">
                AI-generated recap of this conversation. Review before you rely on it.
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
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
