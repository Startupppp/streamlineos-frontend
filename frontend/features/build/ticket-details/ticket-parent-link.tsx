"use client";

import Link from "next/link";
import { CornerLeftUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useTicket } from "@/hooks/api";
import { cn } from "@/lib/utils";
import { getTicketDetailHref } from "../shared/format-ticket-key";

interface TicketParentLinkProps {
  parentTicketId: number | null;
  projectId: number;
  projectKey?: string | null;
  density?: "compact" | "field";
  className?: string;
}

export function TicketParentLink({
  parentTicketId,
  projectId,
  projectKey,
  density = "compact",
  className,
}: TicketParentLinkProps) {
  const { data: parent, isLoading } = useTicket(projectId, parentTicketId ?? 0);

  if (!parentTicketId) return null;
  if (isLoading && !parent) {
    return (
      <Skeleton
        className={cn(
          "rounded-md",
          density === "field" ? "h-5 w-full max-w-[14rem]" : "h-5 w-40",
        )}
      />
    );
  }
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
      className={cn(
        "group inline-flex max-w-full min-w-0 items-center gap-1 rounded-md text-muted-foreground transition-colors hover:text-foreground",
        density === "compact" && "px-1 py-0.5 hover:bg-muted/60",
        density === "field" && "py-0.5",
        className,
      )}
    >
      <CornerLeftUp className="h-3 w-3 shrink-0 text-muted-foreground/70" />
      <span className="shrink-0 font-mono text-[10px] text-muted-foreground/80 group-hover:text-foreground">
        {displayKey}
      </span>
      <TruncatedText
        text={parent.title}
        className={cn(
          "min-w-0 text-muted-foreground group-hover:text-foreground",
          density === "field" ? "text-xs" : "text-[11px]",
        )}
      />
    </Link>
  );
}
