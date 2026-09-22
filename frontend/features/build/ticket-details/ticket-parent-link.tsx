"use client";

import { useCallback, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CornerLeftUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useTicket } from "@/hooks/api";
import { cn } from "@/lib/utils";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";

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
  const router = useRouter();
  const requestLeave = useNavigationLeave();

  const resolvedKey = parent?.project?.key ?? projectKey;
  const href =
    parent && parent.ticketNumber != null
      ? getTicketDetailHref(parent.projectId ?? projectId, resolvedKey, parent.ticketNumber)
      : null;

  const handleNavigate = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (!href) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      requestLeave(() => router.push(href));
    },
    [href, requestLeave, router],
  );

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
  if (!parent || parent.ticketNumber == null || !href) return null;

  const displayKey = resolvedKey
    ? `${resolvedKey}-${parent.ticketNumber}`
    : `#${parent.ticketNumber}`;

  return (
    <Link
      href={href}
      onClick={handleNavigate}
      className={cn(
        "group inline-flex max-w-full min-w-0 items-center gap-1 rounded-md text-muted-foreground transition-colors hover:text-foreground",
        density === "compact" && "px-1 py-0.5 hover:bg-muted/60",
        density === "field" && "py-0.5",
        className,
      )}
    >
      <CornerLeftUp className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="shrink-0 font-mono text-micro text-muted-foreground group-hover:text-foreground">
        {displayKey}
      </span>
      <TruncatedText
        text={parent.title}
        className={cn(
          "min-w-0 text-muted-foreground group-hover:text-foreground",
          density === "field" ? "text-xs" : "text-dense",
        )}
      />
    </Link>
  );
}
