"use client";

import Link from "next/link";
import { CornerLeftUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTicket } from "@/hooks/api";
import { getTicketDetailHref } from "../shared/format-ticket-key";

interface TicketParentLinkProps {
  parentTicketId: number | null;
  projectId: number;
  projectKey?: string | null;
}

export function TicketParentLink({
  parentTicketId,
  projectId,
  projectKey,
}: TicketParentLinkProps) {
  const { data: parent, isLoading } = useTicket(projectId, parentTicketId ?? 0);

  if (!parentTicketId) return null;
  if (isLoading && !parent) return <Skeleton className="h-7 w-56 rounded-lg" />;
  if (!parent || parent.ticketNumber == null) return null;

  const resolvedKey = parent.project?.key ?? projectKey;
  const href = getTicketDetailHref(
    parent.projectId ?? projectId,
    resolvedKey,
    parent.ticketNumber,
  );
  const displayKey = resolvedKey
    ? `${resolvedKey}-${parent.ticketNumber}`
    : `#${parent.ticketNumber}`;

  return (
    <Link
      href={href}
      className="group inline-flex max-w-full items-center gap-1.5 rounded-lg bg-muted/40 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
    >
      <CornerLeftUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
      <span className="shrink-0 font-medium">Parent</span>
      <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">
        {displayKey}
      </span>
      <span
        className="min-w-0 truncate [overflow-wrap:anywhere]"
        title={parent.title}
      >
        {parent.title}
      </span>
    </Link>
  );
}
