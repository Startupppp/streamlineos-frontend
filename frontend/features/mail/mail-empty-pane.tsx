"use client";

import { useCallback, useMemo } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ScrollArea,
  SCROLL_AREA_PAGE_BODY_CLASS,
} from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMailMessages } from "@/hooks/api/mail";
import { groupMailMessages } from "./mail-group-messages";
import type { MailMessageSummary } from "@/types/mail";

interface MailEmptyPaneProps {
  variant: "select" | "connect";
  selectedAccountId?: number | "all";
  onConnect?: () => void;
  onSelectMessage?: (message: MailMessageSummary) => void;
  className?: string;
}

function senderLabel(message: MailMessageSummary): string {
  const name = message.from.name?.trim();
  if (name) return name;
  return message.from.email;
}

interface TriagePreviewCardProps {
  message: MailMessageSummary;
  onSelect: (message: MailMessageSummary) => void;
  index: number;
  reduceMotion: boolean | null;
}

function TriagePreviewCard({
  message,
  onSelect,
  index,
  reduceMotion,
}: TriagePreviewCardProps) {
  const handleClick = useCallback(() => {
    onSelect(message);
  }, [message, onSelect]);

  const when = formatDistanceToNow(parseISO(message.date), { addSuffix: true });

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut", delay: index * 0.04 }}
      className={cn(
        "group flex w-full flex-col gap-1 rounded-xl border border-border/50 bg-card/80 px-3.5 py-3 text-left shadow-sm transition-colors",
        "hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        !message.isRead && "border-l-2 border-l-primary",
      )}
    >
      <div className="flex items-baseline justify-between gap-2 min-w-0">
        <span
          className={cn(
            "truncate text-[13px]",
            message.isRead
              ? "font-medium text-foreground/90"
              : "font-semibold text-foreground",
          )}
        >
          {senderLabel(message)}
        </span>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {when}
        </span>
      </div>
      <p
        className={cn(
          "truncate text-[12px]",
          message.isRead
            ? "text-muted-foreground"
            : "font-medium text-foreground",
        )}
      >
        {message.subject || "(no subject)"}
      </p>
      {message.snippet ? (
        <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
          {message.snippet}
        </p>
      ) : null}
    </motion.button>
  );
}

function CalmPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-sm font-medium text-foreground/90">{title}</p>
      <p className="mt-1.5 max-w-xs text-[12px] leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function SelectEmptySurface({
  selectedAccountId,
  onSelectMessage,
  className,
}: {
  selectedAccountId: number | "all";
  onSelectMessage?: (message: MailMessageSummary) => void;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const { data, isLoading } = useMailMessages({
    folder: "inbox",
    accountId: selectedAccountId,
  });

  const allMessages = useMemo(
    () => data?.pages.flatMap((p) => p.messages) ?? [],
    [data],
  );
  const groups = useMemo(
    () => groupMailMessages(allMessages),
    [allMessages],
  );
  const needsYou = groups.find((g) => g.key === "needs_you");
  const today = groups.find((g) => g.key === "today");
  const previewNeeds = (needsYou?.messages ?? []).slice(0, 5);
  const previewToday = (today?.messages ?? []).slice(0, 3);
  const hasPreviews = previewNeeds.length > 0 || previewToday.length > 0;
  const unreadCount = allMessages.filter((m) => !m.isRead).length;

  if (isLoading) {
    return (
      <div
        className={cn(
          "relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden",
          className,
        )}
      >
        <div className="flex flex-col gap-3 px-5 py-6 sm:px-6">
          <Skeleton className="h-3 w-24 rounded" />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border/40 bg-card/60 px-3.5 py-3 space-y-2"
            >
              <div className="flex justify-between gap-2">
                <Skeleton className="h-3.5 w-32 rounded" />
                <Skeleton className="h-3 w-14 rounded" />
              </div>
              <Skeleton className="h-3.5 w-4/5 rounded" />
              <Skeleton className="h-3 w-full rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!hasPreviews || !onSelectMessage) {
    return (
      <div
        className={cn(
          "relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden",
          className,
        )}
      >
        <CalmPlaceholder
          title={
            allMessages.length === 0 ? "Inbox is clear" : "Select a message"
          }
          description={
            allMessages.length === 0
              ? "Use Compose or What needs me in the header when you’re ready."
              : "Choose a thread from the list to read and reply."
          }
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,color-mix(in_oklab,var(--primary)_6%,transparent),transparent_45%)]"
      />

      <div className="relative z-[1] shrink-0 border-b border-border/40 px-5 py-3 sm:px-6">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Start with what needs you
        </h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {unreadCount > 0
            ? `${unreadCount} unread · open a preview or pick from the list`
            : "Open a preview below or choose from the list"}
        </p>
      </div>

      <ScrollArea fill className={cn(SCROLL_AREA_PAGE_BODY_CLASS, "relative z-[1]")}>
        <div className="flex min-h-full flex-col gap-5 px-5 py-4 sm:px-6">
          {previewNeeds.length > 0 ? (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Needs you
                </h3>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {needsYou?.messages.length ?? previewNeeds.length}
                </span>
              </div>
              <div className="grid gap-2">
                {previewNeeds.map((message, index) => (
                  <TriagePreviewCard
                    key={`${message.accountId}-${message.id}`}
                    message={message}
                    onSelect={onSelectMessage}
                    index={index}
                    reduceMotion={reduceMotion}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {previewToday.length > 0 ? (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Today & yesterday
                </h3>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {today?.messages.length ?? previewToday.length}
                </span>
              </div>
              <div className="grid gap-2">
                {previewToday.map((message, index) => (
                  <TriagePreviewCard
                    key={`${message.accountId}-${message.id}`}
                    message={message}
                    onSelect={onSelectMessage}
                    index={index + previewNeeds.length}
                    reduceMotion={reduceMotion}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}

export function MailEmptyPane({
  variant,
  selectedAccountId = "all",
  onConnect,
  onSelectMessage,
  className,
}: MailEmptyPaneProps) {
  if (variant === "connect") {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-1 items-center justify-center p-6",
          className,
        )}
      >
        <EmptyState
          illustrationPreset="mail"
          title="Connect your inbox"
          description="Link Gmail or Outlook to triage, reply, and draft with AI — all inside StreamlineOS."
          action={
            onConnect
              ? { label: "Connect email", onClick: onConnect }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <SelectEmptySurface
      selectedAccountId={selectedAccountId}
      onSelectMessage={onSelectMessage}
      className={className}
    />
  );
}
