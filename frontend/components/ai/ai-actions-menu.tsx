"use client";

import * as React from "react";
import { SparklesIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { AiDraftCard } from "./ai-draft-card";
import { AiQuotaEmptyState } from "./ai-quota-empty-state";
import { AiPermissionDenied } from "./ai-permission-denied";
import type { Citation } from "./ai-citation-chips";
import type { AiUsageMeta } from "./ai-usage-chip";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export interface AiActionResult {
  text: string;
  citations?: Citation[];
  confidence?: number;
  aiUsage?: AiUsageMeta | null;
}

export interface AiAction {
  key: string;
  label: string;
  description?: string;
  run: () => Promise<AiActionResult>;
  onApply?: (text: string) => void;
  applyLabel?: string;
}

interface AiActionsMenuProps {
  actions: AiAction[];
  triggerLabel?: string;
  menuLabel?: string;
  align?: "start" | "end";
  disabled?: boolean;
  className?: string;
}

type ActionState =
  | { status: "loading" }
  | { status: "ready"; result: AiActionResult; aiUsage?: AiUsageMeta | null }
  | { status: "quota" }
  | { status: "denied"; reason: string }
  | { status: "error"; message: string };

export function AiActionsMenu({
  actions,
  triggerLabel = "AI",
  menuLabel = "AI assist",
  align = "end",
  disabled = false,
  className,
}: AiActionsMenuProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState<AiAction | null>(null);
  const [state, setState] = React.useState<ActionState>({ status: "loading" });

  const runAction = React.useCallback(async (action: AiAction) => {
    setActive(action);
    setOpen(true);
    setState({ status: "loading" });
    try {
      const result = await action.run();
      setState({ status: "ready", result, aiUsage: result.aiUsage });
    } catch (error) {
      if (isApiError(error) && error.status === 402) {
        setState({ status: "quota" });
        return;
      }
      if (isApiError(error) && error.status === 403) {
        setState({ status: "denied", reason: getErrorMessage(error) });
        return;
      }
      setState({ status: "error", message: getErrorMessage(error) });
    }
  }, []);

  const handleRetry = React.useCallback(() => {
    if (active) void runAction(active);
  }, [active, runAction]);

  const handleApply = React.useCallback(() => {
    if (active?.onApply && state.status === "ready") {
      active.onApply(state.result.text);
      setOpen(false);
    }
  }, [active, state]);

  if (actions.length === 0) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className={cn("h-8 gap-1.5 text-xs", className)}
            {...hoverHandlers}
          >
            <SparklesIcon ref={iconRef} className="h-3.5 w-3.5 text-primary" />
            {triggerLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-56">
          <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
            {menuLabel}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.key}
              onSelect={() => {
                void runAction(action);
              }}
              className="flex flex-col items-start gap-0.5"
            >
              <span className="text-[13px]">{action.label}</span>
              {action.description && (
                <span className="text-[11px] text-muted-foreground">{action.description}</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
            <SheetTitle className="text-base font-semibold">{active?.label ?? "AI assist"}</SheetTitle>
            <SheetDescription className="text-[13px] text-muted-foreground">
              AI-generated draft grounded in this record. Review before you use it.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {state.status === "loading" && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            )}

            {state.status === "quota" && <AiQuotaEmptyState variant="fill" />}

            {state.status === "denied" && <AiPermissionDenied reason={state.reason} />}

            {state.status === "error" && (
              <div className="flex flex-col items-start gap-3 py-6">
                <p className="text-sm text-muted-foreground">{state.message}</p>
                <Button type="button" variant="outline" size="sm" onClick={handleRetry} className="h-8 text-xs">
                  Retry
                </Button>
              </div>
            )}

            {state.status === "ready" && (
              <AiDraftCard
                citations={state.result.citations}
                confidence={state.result.confidence}
                usage={state.aiUsage}
                onAccept={active?.onApply ? handleApply : undefined}
                acceptLabel={active?.applyLabel ?? "Apply"}
              >
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                  {state.result.text}
                </p>
              </AiDraftCard>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
