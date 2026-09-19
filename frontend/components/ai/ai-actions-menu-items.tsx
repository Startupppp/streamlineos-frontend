"use client";

import { Sparkles } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AiAction } from "./ai-action-types";

export function AiMenuHeader({ label }: { label: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 px-2 py-1">
      <p className="text-dense font-semibold text-foreground">{label}</p>
      <p className="text-dense text-muted-foreground">Choose one</p>
    </div>
  );
}

export function AiMenuActionItem({
  action,
  disabled,
  onRun,
}: {
  action: AiAction;
  disabled: boolean;
  onRun: (action: AiAction) => void;
}) {
  const itemDisabled = disabled || Boolean(action.disabledReason);
  const secondaryText = action.disabledReason ?? action.description;
  const Icon = action.icon ?? Sparkles;

  function handleSelect() {
    if (action.disabledReason) return;
    onRun(action);
  }

  return (
    <DropdownMenuItem
      disabled={itemDisabled}
      onSelect={handleSelect}
      className="min-h-11 cursor-pointer items-start gap-2.5 rounded-md px-2 py-2"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-label font-medium leading-tight text-foreground">
          {action.label}
        </span>
        {secondaryText ? (
          <span
            className={cn(
              "text-dense leading-snug",
              action.disabledReason ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {secondaryText}
          </span>
        ) : null}
      </span>
    </DropdownMenuItem>
  );
}

export function AiDrawerActionButton({
  action,
  disabled,
  onRun,
}: {
  action: AiAction;
  disabled: boolean;
  onRun: (action: AiAction) => void;
}) {
  const itemDisabled = disabled || Boolean(action.disabledReason);
  const secondaryText = action.disabledReason ?? action.description;
  const Icon = action.icon ?? Sparkles;

  function handleClick() {
    if (action.disabledReason) return;
    onRun(action);
  }

  return (
    <button
      type="button"
      disabled={itemDisabled}
      onClick={handleClick}
      className="flex min-h-11 w-full items-start gap-3 rounded-md px-3 py-2.5 text-left hover:bg-muted disabled:opacity-50"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-label font-medium text-foreground">{action.label}</span>
        {secondaryText ? (
          <span className="text-dense text-muted-foreground">{secondaryText}</span>
        ) : null}
      </span>
    </button>
  );
}
