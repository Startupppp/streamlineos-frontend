"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useHydrated } from "@/hooks/common/use-hydrated";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MessageSquare, Ticket } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { isApiError } from "@/lib/api-client";
import {
  commentPermalinkQueryOptions,
  ticketPermalinkQueryOptions,
} from "@/hooks/api/build/comment-permalink";
import { LinkPreviewCard } from "./link-preview-card";
import { getStatusBadgeClass } from "@/features/build/shared/status-badge";
import { formatTicketKey } from "@/features/build/shared/format-ticket-key";
import { TruncatedText } from "@/components/ui/truncated-text";

type InternalLink =
  | { kind: "comment"; projectId: number; ticketId: number; commentId: string; href: string }
  | { kind: "ticket"; projectId: number; ticketId: number; href: string };

function extractFirstUrl(content: string): string | null {
  const match = content.match(/https?:\/\/[^\s<>"']+/);
  return match?.[0] ?? null;
}

function parseInternalLink(raw: string): InternalLink | null {
  if (typeof window === "undefined") return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  const pathMatch = url.pathname.match(/^\/projects\/(\d+)$/);
  if (!pathMatch) return null;
  const projectId = Number(pathMatch[1]);
  const ticketIdStr = url.searchParams.get("ticket");
  if (!ticketIdStr) return null;
  const ticketId = Number(ticketIdStr);
  const commentId = url.searchParams.get("comment");
  if (commentId) {
    return { kind: "comment", projectId, ticketId, commentId, href: raw };
  }
  return { kind: "ticket", projectId, ticketId, href: raw };
}


function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-muted/60", className)} />;
}

function MutedCard({ isOwn, children }: { isOwn: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "mt-2 rounded-xl border px-3 py-2 max-w-[320px]",
        isOwn ? "bg-white/5 border-white/10" : "bg-muted/30 border-border/30",
      )}
    >
      <p className={cn("text-dense", isOwn ? "text-white/40" : "text-muted-foreground/60")}>
        {children}
      </p>
    </div>
  );
}

function CardShell({
  isOwn,
  onClick,
  className,
  children,
}: {
  isOwn: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mt-2 flex flex-col gap-1.5 rounded-xl border p-3 text-left max-w-[320px] w-full",
        "transition-colors duration-200 ease-out motion-reduce:transition-none",
        isOwn
          ? "bg-white/10 border-white/15 hover:bg-white/20"
          : "bg-background border-border/50 hover:bg-muted/30 shadow-sm",
        className,
      )}
    >
      {children}
    </button>
  );
}

function CommentPreviewCard({
  projectId,
  ticketId,
  commentId,
  href,
  isOwn,
}: {
  projectId: number;
  ticketId: number;
  commentId: string;
  href: string;
  isOwn: boolean;
}) {
  const router = useRouter();
  const { data, isLoading, error } = useQuery(
    commentPermalinkQueryOptions(projectId, ticketId, commentId),
  );

  const handleOpen = useCallback(() => router.push(href), [router, href]);

  if (isLoading) {
    return (
      <div
        className={cn(
          "mt-2 rounded-xl border p-3 max-w-[320px]",
          isOwn ? "bg-white/10 border-white/15" : "bg-background border-border/50 shadow-sm",
        )}
      >
        <SkeletonLine className="h-3 w-2/3 mb-2" />
        <SkeletonLine className="h-3 w-full" />
      </div>
    );
  }

  if (error) {
    const code = isApiError(error) ? error.code : undefined;
    if (code === "PROJECTS_FORBIDDEN_TICKET") {
      return <MutedCard isOwn={isOwn}>Restricted ticket</MutedCard>;
    }
    if (code === "PROJECTS_COMMENT_NOT_FOUND" || code === "PROJECTS_TICKET_NOT_FOUND") {
      return <MutedCard isOwn={isOwn}>Not found or deleted</MutedCard>;
    }
    return null;
  }

  if (!data) return null;

  const relativeTime = data.createdAt
    ? formatDistanceToNow(new Date(data.createdAt), { addSuffix: true })
    : "";
  const excerpt =
    data.content.length > 140 ? `${data.content.slice(0, 140)}…` : data.content;

  return (
    <CardShell isOwn={isOwn} onClick={handleOpen}>
      <div className="flex items-center gap-1.5">
        <Ticket className={cn("h-3 w-3 shrink-0", isOwn ? "text-white/60" : "text-primary")} />
        <span
          className={cn(
            "text-dense font-mono font-semibold",
            isOwn ? "text-white/80" : "text-primary",
          )}
        >
          {formatTicketKey(data.ticket.projectKey, data.ticket.ticketNumber)}
        </span>
        <TruncatedText
          text={data.ticket.title}
          className={cn(
            "text-dense max-w-[180px]",
            isOwn ? "text-white/70" : "text-foreground",
          )}
        />
      </div>
      <div className="flex items-start gap-1.5">
        <MessageSquare
          className={cn(
            "h-3 w-3 shrink-0 mt-0.5",
            isOwn ? "text-white/50" : "text-muted-foreground/60",
          )}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-dense line-clamp-2",
              isOwn ? "text-white/70" : "text-muted-foreground",
            )}
          >
            {excerpt}
          </p>
          <p
            className={cn(
              "text-micro mt-0.5",
              isOwn ? "text-white/40" : "text-muted-foreground/60",
            )}
          >
            {data.author.name ?? "Unknown"} &middot; {relativeTime}
          </p>
        </div>
      </div>
    </CardShell>
  );
}

function TicketPreviewCard({
  projectId,
  ticketId,
  href,
  isOwn,
}: {
  projectId: number;
  ticketId: number;
  href: string;
  isOwn: boolean;
}) {
  const router = useRouter();
  const { data, isLoading, error } = useQuery(
    ticketPermalinkQueryOptions(projectId, ticketId),
  );

  const handleOpen = useCallback(() => router.push(href), [router, href]);

  if (isLoading) {
    return (
      <div
        className={cn(
          "mt-2 rounded-xl border p-3 max-w-[320px]",
          isOwn ? "bg-white/10 border-white/15" : "bg-background border-border/50 shadow-sm",
        )}
      >
        <SkeletonLine className="h-3 w-1/3 mb-2" />
        <SkeletonLine className="h-3 w-2/3" />
      </div>
    );
  }

  if (error) {
    const code = isApiError(error) ? error.code : undefined;
    if (code === "PROJECTS_FORBIDDEN_TICKET") {
      return <MutedCard isOwn={isOwn}>Restricted ticket</MutedCard>;
    }
    if (code === "PROJECTS_TICKET_NOT_FOUND") {
      return <MutedCard isOwn={isOwn}>Not found or deleted</MutedCard>;
    }
    return null;
  }

  if (!data) return null;

  const ticketKey = formatTicketKey(data.projectKey, data.ticketNumber);

  return (
    <CardShell isOwn={isOwn} onClick={handleOpen}>
      <div className="flex items-start gap-2">
        <Ticket
          className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", isOwn ? "text-white/60" : "text-primary")}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-dense font-mono font-semibold",
              isOwn ? "text-white/80" : "text-primary",
            )}
          >
            {ticketKey}
          </p>
          <TruncatedText
            text={data.title}
            className={cn(
              "text-xs font-medium mt-0.5",
              isOwn ? "text-white/90" : "text-foreground",
            )}
          />
          <span
            className={cn(
              "mt-1 inline-flex items-center rounded px-1.5 py-px text-micro font-medium",
              getStatusBadgeClass(data.status),
            )}
          >
            {data.status.replace(/_/g, " ")}
          </span>
        </div>
        <ExternalLink
          className={cn("h-3 w-3 shrink-0", isOwn ? "text-white/40" : "text-muted-foreground/40")}
        />
      </div>
    </CardShell>
  );
}

export function InternalLinkPreview({
  content,
  isOwn,
}: {
  content: string;
  isOwn: boolean;
}) {
  const mounted = useHydrated();
  const link = useMemo(() => {
    if (!mounted) return null;
    const raw = extractFirstUrl(content);
    return raw ? parseInternalLink(raw) : null;
  }, [mounted, content]);

  if (!mounted) return null;

  if (link) {
    if (link.kind === "comment") {
      return (
        <CommentPreviewCard
          projectId={link.projectId}
          ticketId={link.ticketId}
          commentId={link.commentId}
          href={link.href}
          isOwn={isOwn}
        />
      );
    }
    return (
      <TicketPreviewCard
        projectId={link.projectId}
        ticketId={link.ticketId}
        href={link.href}
        isOwn={isOwn}
      />
    );
  }

  if (!/https?:\/\//.test(content)) return null;
  return <LinkPreviewCard content={content} isOwn={isOwn} />;
}
