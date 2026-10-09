"use client";

import { forwardRef, useCallback } from "react";
import { PlusIcon, XIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PmPageShell, PM_PANEL } from "@/components/pm-chrome";
import { getUserDisplayName } from "@/lib/person-display";
import { cn } from "@/lib/utils";
import type { ProjectTeamMember } from "@/types/projects";

export const TeamActionsButton = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(function TeamActionsButton({ className, ...props }, ref) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      size="sm"
      className={cn("gap-1.5", className)}
      aria-label="Team actions"
      {...props}
      {...hoverHandlers}
    >
      <EllipsisIcon ref={iconRef} size={14} />
      <span className="hidden sm:inline">Actions</span>
    </Button>
  );
});

export function AddMemberButton({
  isPending,
  onClick,
  disabled,
}: {
  isPending: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <LoadingButton
      size="sm"
      className="h-9 gap-1 text-xs"
      onClick={onClick}
      disabled={disabled}
      isPending={isPending}
      loadingText="Adding…"
      {...hoverHandlers}
    >
      <PlusIcon ref={iconRef} size={12} /> Add
    </LoadingButton>
  );
}

export function RemoveMemberButton({
  member,
  isPending,
  onRemove,
}: {
  member: ProjectTeamMember;
  isPending: boolean;
  onRemove: (userId: string) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleClick = useCallback(
    () => onRemove(member.userId),
    [member.userId, onRemove],
  );
  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-7 shrink-0"
      onClick={handleClick}
      disabled={isPending}
      aria-label={`Remove ${getUserDisplayName(member)}`}
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={14} />
    </Button>
  );
}

export function MemberRoleSelect({
  member,
  isPending,
  onRoleChange,
}: {
  member: ProjectTeamMember;
  isPending: boolean;
  onRoleChange: (memberUserId: string, role: "member" | "lead") => void;
}) {
  const role: "member" | "lead" = member.role === "lead" ? "lead" : "member";
  const roleLabel = `Role for ${getUserDisplayName(member)}`;

  function handleValueChange(value: string) {
    if (value === "member" || value === "lead") {
      onRoleChange(member.userId, value);
    }
  }

  return (
    <Select value={role} onValueChange={handleValueChange} disabled={isPending}>
      <SelectTrigger
        className="h-9 w-24 shrink-0 border-input bg-card"
        aria-label={roleLabel}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
        <SelectItem value="member">Member</SelectItem>
        <SelectItem value="lead">Lead</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function TeamDetailSkeleton() {
  return (
    <PmPageShell>
      <div className={cn(PM_PANEL, "space-y-3 p-4")}>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className={cn(PM_PANEL, "space-y-2 p-2")}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </PmPageShell>
  );
}
