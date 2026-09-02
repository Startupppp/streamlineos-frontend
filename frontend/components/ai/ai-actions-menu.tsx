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
import { classifyAiError } from "./ai-error-state";
import { cn } from "@/lib/utils";

export type { AiActionResult } from "./ai-action-result-body";

export type AiResultSurface = "inline" | "popover" | "sheet" | "dialog";

export interface AiAction {
  key: string;
  label: string;
  description?: string;
  run: (signal?: AbortSignal) => Promise<AiActionResult>;
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
  return action.surface ?? defaultSurface ?? "popover";
}

function buildInlineSession(
  action: AiAction,
  state: AiActionResultState,
  handlers: {
    apply: () => void;
    reject: () => void;
    retry: () => void;
    cancel: () => void;
  },
): AiInlineSession {
  return {
    actionKey: action.key,
    state,
    apply: handlers.apply,
    reject: handlers.reject,
    retry: handlers.retry,
    cancel: handlers.cancel,
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
  const runSeqRef = React.useRef(0);
  const inFlightRef = React.useRef(false);
  const controllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    activeRef.current = active;
  }, [active]);

  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /**
   * Abort orphans the in-flight settle by bumping the sequence: a `run` that
   * ignores its signal still resolves, and without the bump that stale answer
   * would land on the surface the user already stopped.
   */
  const discardInFlight = React.useCallback(() => {
    if (!inFlightRef.current) return false;
    runSeqRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    inFlightRef.current = false;
    return true;
  }, []);

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
          discardInFlight();
          action.onInlineChange?.(null);
          inlineActionRef.current = null;
        },
        retry: () => {
          void runActionRef.current(action);
        },
        cancel: () => {
          cancelRunRef.current();
        },
      };

      action.onInlineChange(buildInlineSession(action, nextState, handlers));
    },
    [discardInFlight],
  );

  const runActionRef = React.useRef<(action: AiAction) => Promise<void>>(
    async () => {},
  );
  const cancelRunRef = React.useRef<() => void>(() => {});

  const runAction = React.useCallback(
    async (action: AiAction) => {
      if (inFlightRef.current) return;

      const surface = resolveSurface(action, defaultSurface);

      if (surface === "inline" && !action.onInlineChange) {
        if (process.env.NODE_ENV === "development") {
          console.error(
            `AiActionsMenu: inline action "${action.key}" missing onInlineChange`,
          );
        }
        return;
      }

      const stamp = ++runSeqRef.current;
      const controller = new AbortController();
      controllerRef.current = controller;
      inFlightRef.current = true;

      setActive(action);
      setState({ status: "loading" });
      if (surface === "inline") {
        inlineActionRef.current = action;
        pushInlineSession(action, { status: "loading" });
      } else if (surface === "popover") {
        setPopoverOpen(true);
      } else {
        setOverlayOpen(true);
      }

      let nextState: AiActionResultState;
      try {
        const result = await action.run(controller.signal);
        nextState = { status: "ready", result, aiUsage: result.aiUsage };
      } catch (error) {
        nextState = classifyAiError(error);
      }

      if (runSeqRef.current !== stamp) return;
      inFlightRef.current = false;
      controllerRef.current = null;
      setState(nextState);
      if (surface === "inline") pushInlineSession(action, nextState);
    },
    [defaultSurface, pushInlineSession],
  );

  runActionRef.current = runAction;

  const cancelRun = React.useCallback(() => {
    if (!discardInFlight()) return;
    setState({ status: "cancelled" });
    const action = inlineActionRef.current;
    if (action) pushInlineSession(action, { status: "cancelled" });
  }, [discardInFlight, pushInlineSession]);

  cancelRunRef.current = cancelRun;

  React.useEffect(() => {
    return () => {
      controllerRef.current?.abort();
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

  const handleOverlayOpenChange = React.useCallback(
    (open: boolean) => {
      setOverlayOpen(open);
      if (!open) {
        discardInFlight();
        setActive(null);
        setState({ status: "loading" });
      }
    },
    [discardInFlight],
  );

  const handlePopoverOpenChange = React.useCallback(
    (open: boolean) => {
      setPopoverOpen(open);
      if (!open) {
        discardInFlight();
        setActive(null);
        setState({ status: "loading" });
      }
    },
    [discardInFlight],
  );

  if (actions.length === 0) return null;

  const activeSurface = active ? resolveSurface(active, defaultSurface) : null;

  const resultBody = (
    <AiActionResultBody
      state={state}
      onApply={active?.onApply ? handleApply : undefined}
      applyLabel={active?.applyLabel ?? "Apply"}
      onRetry={handleRetry}
      onCancel={cancelRun}
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
        <span className="text-label">{action.label}</span>
        {secondaryText ? (
          <span className="text-dense text-muted-foreground">
            {secondaryText}
          </span>
        ) : null}
      </DropdownMenuItem>
    );
  });

  const menuContent = (
    <>
      <DropdownMenuLabel className="text-dense font-medium text-muted-foreground">
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
              <SheetDescription className="text-label text-muted-foreground">
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
              <DialogDescription className="text-label text-muted-foreground">
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
            <SheetDescription className="text-label text-muted-foreground">
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
            <DialogDescription className="text-label text-muted-foreground">
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
