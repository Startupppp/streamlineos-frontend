"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { CheckCheckIcon } from "@animateicons/react/lucide";
import { DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { useUnifiedInbox } from "@/hooks/api/inbox";
import {
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/api/notifications-inbox";
import {
  INBOX_SOURCE_LABELS,
  degradedSources,
} from "./unified-inbox/inbox-sources";
import { formatRelativeTime } from "./format-relative-time";
import { TruncatedText } from "@/components/ui/truncated-text";
import { normalizeBuildDeepLink } from "@/lib/build/normalize-build-deep-link";
import { toSearchParams } from "@/lib/route-search-params";
import type {
  UnifiedInboxItem,
  NotificationInboxItem,
  BroadcastInboxItem,
  MailInboxItem,
  BuildApprovalInboxItem,
} from "@/types/inbox";

function PanelSkeleton() {
  return (
    <div className="space-y-0.5 px-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-2.5 px-2 py-2">
          <Skeleton className="h-7 w-7 rounded-md shrink-0" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-full max-w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

function InboxItemRow({
  item,
  onItemClick,
}: {
  item: UnifiedInboxItem;
  onItemClick: (item: UnifiedInboxItem) => void;
}) {
  const sourceLabel = INBOX_SOURCE_LABELS[item.kind];

  function handleClick() {
    onItemClick(item);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/50 rounded-md",
        !item.isRead && "bg-primary/5",
      )}
    >
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <TruncatedText
            text={item.subject}
            className={cn(
              "min-w-0 flex-1 text-label leading-snug",
              item.isRead
                ? "font-medium text-muted-foreground"
                : "font-semibold text-foreground",
            )}
          />
          <span className="shrink-0 text-dense text-muted-foreground">
            {formatRelativeTime(item.timestamp)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{sourceLabel}</span>
      </div>
      {!item.isRead && (
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  );
}

export interface NotificationBellPanelProps {
  unreadCount: number;
  surface: "popover" | "drawer";
  onClose: () => void;
}

export function NotificationBellPanel({
  unreadCount,
  surface,
  onClose,
}: NotificationBellPanelProps) {
  const router = useRouter();
  const { data, isLoading, isError } = useUnifiedInbox({ limit: 6 });

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const {
    iconRef: markAllReadIconRef,
    hoverHandlers: markAllReadHoverHandlers,
  } = useAnimatedIcon();

  const pages = data?.pages ?? [];
  const firstPage = pages[0];
  const items = firstPage?.items ?? [];
  const isDegraded = firstPage?.degraded === true;
  const degraded = isDegraded ? degradedSources(pages) : [];

  const canMarkAllRead =
    unreadCount > 0 &&
    items.some(
      (item) =>
        !item.isRead &&
        (item.kind === "notification" || item.kind === "broadcast"),
    );

  const handleNotificationClick = useCallback(
    (item: NotificationInboxItem) => {
      if (!item.isRead) markRead.mutate(item.id);
      if (item.deepLink) {
        onClose();
        router.push(normalizeBuildDeepLink(item.deepLink));
      }
    },
    [markRead, onClose, router],
  );

  const handleBroadcastClick = useCallback(
    (item: BroadcastInboxItem) => {
      if (item.deepLink) {
        onClose();
        router.push(normalizeBuildDeepLink(item.deepLink));
      }
    },
    [onClose, router],
  );

  const handleMailClick = useCallback(
    (item: MailInboxItem) => {
      const params = toSearchParams({
        messageId: item.id,
        accountId: String(item.accountId),
      });
      onClose();
      router.push(`/mail?${params.toString()}`);
    },
    [onClose, router],
  );

  const handleApprovalClick = useCallback(
    (item: BuildApprovalInboxItem) => {
      const params = toSearchParams({ projectId: String(item.projectId) });
      onClose();
      router.push(`/build/approvals?${params.toString()}`);
    },
    [onClose, router],
  );

  const handleItemClick = useCallback(
    (item: UnifiedInboxItem) => {
      if (item.kind === "notification") handleNotificationClick(item);
      else if (item.kind === "broadcast") handleBroadcastClick(item);
      else if (item.kind === "mail") handleMailClick(item);
      else handleApprovalClick(item);
    },
    [
      handleNotificationClick,
      handleBroadcastClick,
      handleMailClick,
      handleApprovalClick,
    ],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate(undefined);
  }, [markAllRead]);

  const title =
    surface === "drawer" ? (
      <DrawerTitle className="text-sm font-semibold text-foreground">
        Inbox
      </DrawerTitle>
    ) : (
      <h3 className="text-sm font-semibold text-foreground">Inbox</h3>
    );

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        {title}
        <div className="flex items-center gap-1">
          {canMarkAllRead && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={markAllRead.isPending}
              aria-label="Mark all notifications read"
              onClick={handleMarkAllRead}
              {...markAllReadHoverHandlers}
            >
              <CheckCheckIcon ref={markAllReadIconRef} size={14} />
            </Button>
          )}
        </div>
      </div>

      {isDegraded && degraded.length > 0 && (
        <div className="border-b border-border bg-muted/40 px-3 py-1.5">
          <p className="text-xs text-muted-foreground">
            {degraded.map((s) => INBOX_SOURCE_LABELS[s.kind]).join(", ")}{" "}
            {degraded.length === 1 ? "is" : "are"} temporarily unavailable.
          </p>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
        {isLoading ? (
          <PanelSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <Inbox className="mb-2 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Couldn&apos;t load inbox
            </p>
            <Link
              href="/inbox"
              onClick={onClose}
              className="mt-0.5 text-xs text-accent hover:underline"
            >
              Open Inbox
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <Inbox className="mb-2 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              You&apos;re all caught up
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              No new items in your inbox
            </p>
          </div>
        ) : (
          items.map((item) => (
            <InboxItemRow
              key={item.dedupKey}
              item={item}
              onItemClick={handleItemClick}
            />
          ))
        )}
      </div>

      <div className="border-t border-border px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <Link
          href="/inbox"
          onClick={onClose}
          className="block w-full py-1 text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Open Inbox →
        </Link>
      </div>
    </>
  );
}
