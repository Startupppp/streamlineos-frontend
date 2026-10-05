"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserDisplayName, getUserInitials, type NamedUser } from "@/lib/person-display";
import { cn, resolveImageUrl } from "@/lib/utils";

export interface BuildMobileCardPerson {
  user: NamedUser | null | undefined;
  avatarUrl?: string | null;
  role: string;
}

export interface BuildMobileCardMeta {
  label: string;
  value: ReactNode;
}

interface BuildMobileCardProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  status?: ReactNode;
  person?: BuildMobileCardPerson;
  meta?: readonly BuildMobileCardMeta[];
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
  onClick?: () => void;
  priority?: string;
  dueDate?: string;
  estimate?: number | null;
  type?: string;
}

function CardPerson({ person }: { person: BuildMobileCardPerson }) {
  const name = getUserDisplayName(person.user);
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Avatar className="h-5 w-5 shrink-0">
        {person.avatarUrl ? (
          <AvatarImage src={resolveImageUrl(person.avatarUrl)} alt="" />
        ) : null}
        <AvatarFallback className="text-dense">
          {getUserInitials(person.user)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-label text-muted-foreground">
        <span className="sr-only">{person.role}: </span>
        {name}
      </span>
    </span>
  );
}

function CardMeta({ item }: { item: BuildMobileCardMeta }) {
  return (
    <span className="flex min-w-0 items-center gap-1 text-label text-muted-foreground">
      <span className="shrink-0">{item.label}</span>
      <span className="min-w-0 truncate font-medium text-foreground">
        {item.value}
      </span>
    </span>
  );
}

export function BuildMobileCard({
  eyebrow,
  title,
  status,
  person,
  meta,
  actions,
  footer,
  className,
  onClick,
  priority,
  dueDate,
  estimate,
  type,
}: BuildMobileCardProps) {
  const metaItems = meta ?? [];

  const signalMeta: BuildMobileCardMeta[] = [];
  if (priority) signalMeta.push({ label: "Priority", value: priority });
  if (dueDate) signalMeta.push({ label: "Due", value: dueDate });
  if (estimate != null) signalMeta.push({ label: "Estimate", value: estimate });
  if (type) signalMeta.push({ label: "Type", value: type });

  const allMeta = [...metaItems, ...signalMeta];

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (onClick && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onClick();
      }
    },
    [onClick],
  );

  const titleStr = typeof title === "string" ? title : undefined;

  return (
    <div
      className={cn("flex min-w-0 flex-col gap-2.5", className)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
    >
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          {eyebrow ? (
            <div className="truncate font-mono text-dense font-normal text-muted-foreground">
              {eyebrow}
            </div>
          ) : null}
          <div
            className="truncate text-sm font-medium text-foreground"
            title={titleStr}
          >
            {title}
          </div>
        </div>
        {status ? <div className="shrink-0 pt-0.5">{status}</div> : null}
        {actions ? <div className="-mr-1 shrink-0">{actions}</div> : null}
      </div>

      {person || allMeta.length > 0 ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          {person ? <CardPerson person={person} /> : null}
          {allMeta.map((item) => (
            <CardMeta key={item.label} item={item} />
          ))}
        </div>
      ) : null}

      {footer}
    </div>
  );
}
