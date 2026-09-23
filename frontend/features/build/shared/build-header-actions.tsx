"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  BUILD_HEADER_OVERFLOW_LABEL,
  planBuildHeaderActions,
  type BuildHeaderAction,
} from "./build-header-actions-plan";

export type { BuildHeaderAction };

interface BuildHeaderActionsProps {
  actions: readonly BuildHeaderAction[];
  className?: string;
}

function ActionIcon({ icon: Icon }: { icon?: LucideIcon }) {
  if (!Icon) return null;
  return <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />;
}

function HeaderActionButton({
  action,
  className,
}: {
  action: BuildHeaderAction;
  className?: string;
}) {
  const variant = action.primary ? "default" : (action.variant ?? "outline");
  const merged = cn("min-w-0 justify-center", className);

  if (action.href) {
    return (
      <Button asChild variant={variant} className={merged}>
        <Link href={action.href}>
          <ActionIcon icon={action.icon} />
          <span className="truncate">{action.label}</span>
        </Link>
      </Button>
    );
  }

  return (
    <LoadingButton
      type="button"
      variant={variant}
      className={merged}
      disabled={action.disabled}
      isPending={action.isPending}
      loadingText={action.loadingLabel}
      onClick={action.onSelect}
    >
      <ActionIcon icon={action.icon} />
      <span className="truncate">{action.label}</span>
    </LoadingButton>
  );
}

function OverflowMenuItem({ action }: { action: BuildHeaderAction }) {
  if (action.href) {
    return (
      <DropdownMenuItem asChild disabled={action.disabled}>
        <Link href={action.href}>
          <ActionIcon icon={action.icon} />
          {action.label}
        </Link>
      </DropdownMenuItem>
    );
  }
  return (
    <DropdownMenuItem disabled={action.disabled} onSelect={action.onSelect}>
      <ActionIcon icon={action.icon} />
      {action.label}
    </DropdownMenuItem>
  );
}

function OverflowMenu({
  actions,
  className,
}: {
  actions: readonly BuildHeaderAction[];
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn("shrink-0", className)}
          aria-label={BUILD_HEADER_OVERFLOW_LABEL}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action) => (
          <OverflowMenuItem key={action.id} action={action} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BuildHeaderActions({
  actions,
  className,
}: BuildHeaderActionsProps) {
  const plan = planBuildHeaderActions(actions);
  if (plan.isEmpty) return null;

  return (
    <div
      data-slot="build-header-actions"
      className={cn(
        "grid w-full min-w-0 items-center gap-2",
        plan.mobileColumns,
        "sm:flex sm:w-auto sm:items-center sm:justify-end",
        className,
      )}
    >
      {plan.mobileInline.map((action) => (
        <HeaderActionButton
          key={action.id}
          action={action}
          className="w-full min-w-0 sm:hidden"
        />
      ))}
      {plan.mobileOverflow.length > 0 ? (
        <OverflowMenu actions={plan.mobileOverflow} className="sm:hidden" />
      ) : null}

      {plan.desktopInline.map((action) => (
        <HeaderActionButton
          key={action.id}
          action={action}
          className="hidden shrink-0 sm:inline-flex"
        />
      ))}
      {plan.desktopOverflow.length > 0 ? (
        <OverflowMenu
          actions={plan.desktopOverflow}
          className="hidden sm:inline-flex"
        />
      ) : null}
    </div>
  );
}
