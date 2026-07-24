"use client";

import * as React from "react";
import { SparklesIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AiActionResultBody,
  type AiActionResult,
  type AiActionResultState,
} from "./ai-action-result-body";
import type { AiInlineSession } from "./ai-inline-preview";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export type { AiActionResult } from "./ai-action-result-body";

export type AiResultSurface = "inline" | "popover" | "sheet" | "dialog";

export interface AiAction {
  key: string;
  label: string;
  description?: string;
  run: () => Promise<AiActionResult>;
  onApply?: (text: string) => void;
  applyLabel?: string;
  surface?: AiResultSurface;
  disabledReason?: string;
  onInlineChange?: (session: AiInlineSession | null) => void;
}

interface AiActionsMenuProps {
  actions: AiAction[];
  triggerLabel?: string;
  menuLabel?: string;
  align?: "start" | "end";
  disabled?: boolean;
  className?: string;
  asSubmenu?: boolean;
  defaultSurface?: AiResultSurface;
}

function resolveSurface(
  action: AiAction,
  defaultSurface?: AiResultSurface,
): AiResultSurface {
  return action.surface ?? defaultSurface ?? "sheet";
}

function toInlineStatus(state: AiActionResultState): AiInlineSession["status"] {
  if (state.status === "loading") return "loading";
  if (state.status === "ready") return "ready";
  if (state.status === "quota") return "quota";
  if (state.status === "denied") return "denied";
  return "error";
}

function buildInlineSession(
  action: AiAction,
  state: AiActionResultState,
  handlers: {
    apply: () => void;
    reject: () => void;
    retry: () => void;
  },
): AiInlineSession {
  return {
    actionKey: action.key,
    status: toInlineStatus(state),
    result: state.status === "ready" ? state.result : undefined,
    errorMessage: state.status === "error" ? state.message : undefined,
    deniedReason: state.status === "denied" ? state.reason : undefined,
    apply: handlers.apply,
    reject: handlers.reject,
    retry: handlers.retry,
  };
}

export function AiActionsMenu({
  actions,
  triggerLabel = "AI",
  menuLabel = "AI assist",
  align = "end",
  disabled = false,
  className,
  asSubmenu = false,
  defaultSurface,
}: AiActionsMenuProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const [active, setActive] = React.useState<AiAction | null>(null);
  const [state, setState] = React.useState<AiActionResultState>({
    status: "loading",
  });
  const [overlayOpen, setOverlayOpen] = React.useState(false);
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  const activeRef = React.useRef<AiAction | null>(null);
  const stateRef = React.useRef<AiActionResultState>({ status: "loading" });
  const inlineActionRef = React.useRef<AiAction | null>(null);

  React.useEffect(() => {
    activeRef.current = active;
  }, [active]);

  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const pushInlineSession = React.useCallback(
    (action: AiAction, nextState: AiActionResultState) => {
      if (!action.onInlineChange) return;

      const handlers = {
        apply: () => {
          const currentAction = activeRef.current;
          const currentState = stateRef.current;
          if (currentAction?.onApply && currentState.status === "ready") {
            currentAction.onApply(currentState.result.text);
          }
          action.onInlineChange?.(null);
          inlineActionRef.current = null;
        },
        reject: () => {
          action.onInlineChange?.(null);
          inlineActionRef.current = null;
        },
        retry: () => {
          void runActionRef.current(action);
        },
      };

      if (nextState.status === "loading") {
        action.onInlineChange(buildInlineSession(action, nextState, handlers));
        return;
      }

      action.onInlineChange(buildInlineSession(action, nextState, handlers));
    },
    [],
  );

  const runActionRef = React.useRef<(action: AiAction) => Promise<void>>(
    async () => {},
  );

  const runAction = React.useCallback(
    async (action: AiAction) => {
      const surface = resolveSurface(action, defaultSurface);

      if (surface === "inline") {
        if (!action.onInlineChange) {
          if (process.env.NODE_ENV === "development") {
            console.error(
              `AiActionsMenu: inline action "${action.key}" missing onInlineChange`,
            );
          }
          return;
        }
        inlineActionRef.current = action;
        setActive(action);
        setState({ status: "loading" });
        pushInlineSession(action, { status: "loading" });
      } else if (surface === "popover") {
        setActive(action);
        setState({ status: "loading" });
        setPopoverOpen(true);
      } else {
        setActive(action);
        setState({ status: "loading" });
        setOverlayOpen(true);
      }

      try {
        const result = await action.run();
        const nextState: AiActionResultState = {
          status: "ready",
          result,
          aiUsage: result.aiUsage,
        };
        setState(nextState);
        if (surface === "inline") {
          pushInlineSession(action, nextState);
        }
      } catch (error) {
        let nextState: AiActionResultState;
        if (isApiError(error) && error.status === 402) {
          nextState = { status: "quota" };
        } else if (isApiError(error) && error.status === 403) {
          nextState = { status: "denied", reason: getErrorMessage(error) };
        } else {
          nextState = { status: "error", message: getErrorMessage(error) };
        }
        setState(nextState);
        if (surface === "inline") {
          pushInlineSession(action, nextState);
        }
      }
    },
    [defaultSurface, pushInlineSession],
  );

  runActionRef.current = runAction;

  React.useEffect(() => {
    return () => {
      inlineActionRef.current?.onInlineChange?.(null);
    };
  }, []);

  const handleRetry = React.useCallback(() => {
    if (active) void runAction(active);
  }, [active, runAction]);

  const handleApply = React.useCallback(() => {
    if (active?.onApply && state.status === "ready") {
      active.onApply(state.result.text);
    }
    setOverlayOpen(false);
    setPopoverOpen(false);
  }, [active, state]);

  const handleOverlayOpenChange = React.useCallback((open: boolean) => {
    setOverlayOpen(open);
    if (!open) {
      setActive(null);
      setState({ status: "loading" });
    }
  }, []);

  const handlePopoverOpenChange = React.useCallback((open: boolean) => {
    setPopoverOpen(open);
    if (!open) {
      setActive(null);
      setState({ status: "loading" });
    }
  }, []);

  if (actions.length === 0) return null;

  const activeSurface = active ? resolveSurface(active, defaultSurface) : null;

  const resultBody = (
    <AiActionResultBody
      state={state}
      onApply={active?.onApply ? handleApply : undefined}
      applyLabel={active?.applyLabel ?? "Apply"}
      onRetry={handleRetry}
    />
  );

  const actionItems = actions.map((action) => {
    const itemDisabled = disabled || Boolean(action.disabledReason);
    const secondaryText = action.disabledReason ?? action.description;
    return (
      <DropdownMenuItem
        key={action.key}
        disabled={itemDisabled}
        onSelect={() => {
          if (action.disabledReason) return;
          void runAction(action);
        }}
        className="flex flex-col items-start gap-0.5"
      >
        <span className="text-[13px]">{action.label}</span>
        {secondaryText ? (
          <span className="text-[11px] text-muted-foreground">
            {secondaryText}
          </span>
        ) : null}
      </DropdownMenuItem>
    );
  });

  const menuContent = (
    <>
      <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
        {menuLabel}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {actionItems}
    </>
  );

  const popoverResult =
    activeSurface === "popover" && popoverOpen ? (
      <ResponsivePopoverContent
        title={active?.label ?? "AI assist"}
        align={align}
        className="w-[min(24rem,calc(100vw-2rem))] max-h-[min(24rem,70vh)] overflow-y-auto p-4"
      >
        {resultBody}
      </ResponsivePopoverContent>
    ) : null;

  if (asSubmenu) {
    return (
      <>
        <ResponsivePopover
          open={popoverOpen}
          onOpenChange={handlePopoverOpenChange}
        >
          <DropdownMenuSub>
            <ResponsivePopoverTrigger asChild>
              <DropdownMenuSubTrigger disabled={disabled} className={className}>
                <SparklesIcon
                  ref={iconRef}
                  className="h-3.5 w-3.5 text-primary"
                />
                {triggerLabel}
              </DropdownMenuSubTrigger>
            </ResponsivePopoverTrigger>
            <DropdownMenuSubContent className="w-56">
              {menuContent}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {popoverResult}
        </ResponsivePopover>

        <Sheet
          open={overlayOpen && activeSurface === "sheet"}
          onOpenChange={handleOverlayOpenChange}
        >
          <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
            <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
              <SheetTitle className="text-base font-semibold">
                {active?.label ?? "AI assist"}
              </SheetTitle>
              <SheetDescription className="text-[13px] text-muted-foreground">
                AI-generated draft grounded in this record. Review before you
                use it.
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {resultBody}
            </div>
          </SheetContent>
        </Sheet>

        <Dialog
          open={overlayOpen && activeSurface === "dialog"}
          onOpenChange={handleOverlayOpenChange}
        >
          <DialogContent className="flex max-h-[min(640px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
            <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
              <DialogTitle className="text-base font-semibold">
                {active?.label ?? "AI assist"}
              </DialogTitle>
              <DialogDescription className="text-[13px] text-muted-foreground">
                AI-generated draft grounded in this record. Review before you
                use it.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {resultBody}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <ResponsivePopover
        open={popoverOpen}
        onOpenChange={handlePopoverOpenChange}
      >
        <DropdownMenu>
          <ResponsivePopoverTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                className={cn("h-8 gap-1.5 text-xs", className)}
                {...hoverHandlers}
              >
                <SparklesIcon
                  ref={iconRef}
                  className="h-3.5 w-3.5 text-primary"
                />
                {triggerLabel}
              </Button>
            </DropdownMenuTrigger>
          </ResponsivePopoverTrigger>
          <DropdownMenuContent align={align} className="w-56">
            {menuContent}
          </DropdownMenuContent>
        </DropdownMenu>
        {popoverResult}
      </ResponsivePopover>

      <Sheet
        open={overlayOpen && activeSurface === "sheet"}
        onOpenChange={handleOverlayOpenChange}
      >
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
            <SheetTitle className="text-base font-semibold">
              {active?.label ?? "AI assist"}
            </SheetTitle>
            <SheetDescription className="text-[13px] text-muted-foreground">
              AI-generated draft grounded in this record. Review before you use
              it.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {resultBody}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={overlayOpen && activeSurface === "dialog"}
        onOpenChange={handleOverlayOpenChange}
      >
        <DialogContent className="flex max-h-[min(640px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle className="text-base font-semibold">
              {active?.label ?? "AI assist"}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              AI-generated draft grounded in this record. Review before you use
              it.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {resultBody}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
