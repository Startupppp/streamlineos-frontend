"use client";

import { AlertTriangle, ArrowUp, Minus, ArrowDown, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getUserInitials, type NamedUser } from "@/features/projects/shared/resolve-user-name";
import { TicketTypeIcon } from "./ticket-type-icon";
import { priorityConfig } from "./types";

interface FilterMember extends NamedUser {
  id: string;
  image?: string | null;
}

const PRIORITY_ICONS = {
  URGENT: AlertTriangle,
  HIGH: ArrowUp,
  MEDIUM: Minus,
  LOW: ArrowDown,
} as const;

type PriorityKey = keyof typeof PRIORITY_ICONS;

function resolvePriorityKey(priority: string): PriorityKey {
  const key = priority.toUpperCase();
  if (key in PRIORITY_ICONS) {
    return key as PriorityKey;
  }
  return "MEDIUM";
}

export function FilterPriorityLeading({ priority }: { priority: string }) {
  const key = resolvePriorityKey(priority);
  const cfg = priorityConfig[key] ?? priorityConfig.MEDIUM;
  const Icon = PRIORITY_ICONS[key];
  return <Icon className={cn("h-3.5 w-3.5 shrink-0", cfg.color)} />;
}

export function FilterTypeLeading({ type }: { type: string }) {
  return <TicketTypeIcon type={type} size="sm" />;
}

export function FilterLabelDot({ color }: { color: string | null | undefined }) {
  if (!color) return null;
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

export function FilterAssigneeLeading({
  assigneeId,
  member,
}: {
  assigneeId: string;
  member?: FilterMember | null;
}) {
  if (assigneeId === "@me") {
    return <User className="h-4 w-4 shrink-0 text-blue-500" />;
  }
  if (assigneeId === "__unassigned__") {
    return <User className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
  if (member) {
    return (
      <Avatar className="h-4 w-4 shrink-0">
        <AvatarImage src={resolveImageUrl(member.image)} />
        <AvatarFallback className="text-[7px] bg-primary/10 font-medium text-primary">
          {getUserInitials(member)}
        </AvatarFallback>
      </Avatar>
    );
  }
  return <User className="h-4 w-4 shrink-0 text-muted-foreground" />;
}
