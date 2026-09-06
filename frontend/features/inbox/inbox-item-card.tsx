"use client";

import { memo, useCallback } from "react";
import { Mail, CheckCircle, Clock, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { NotificationCard } from "@/features/notifications/notification-card";
import { formatRelativeTime } from "@/features/notifications/format-relative-time";
import type {
  UnifiedInboxItem,
  MailInboxItem,
  BuildApprovalInboxItem,
} from "@/types/inbox";

function assertNever(x: never): never {
  throw new Error(`Unhandled inbox kind: ${String((x as { kind: string }).kind)}`);
}

interface MailItemCardProps {
  item: MailInboxItem;
  onClick: (item: MailInboxItem) => void;
}

function MailItemCard({ item, onClick }: MailItemCardProps) {
  const handleClick = useCallback(() => onClick(item), [item, onClick]);
  const senderLabel = item.actor?.name ?? item.actor?.id ?? "Unknown";
  return (
    <button
      type="button"
      className={cn(
        "w-full text-left rounded-xl border border-border/70 p-3 transition-colors hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        item.isRead ? "bg-card" : "bg-primary/5 border-l-4 border-l-primary",
      )}
      onClick={handleClick}
      aria-label={`Mail from ${senderLabel}: ${item.subject}`}
    >
      <div className="flex items-start gap-2 min-w-0">
        <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 min-w-0">
            <TruncatedText
              text={senderLabel}
              className={cn(
                "text-label min-w-0",
                item.isRead ? "font-medium text-foreground/80" : "font-semibold text-foreground",
              )}
            />
            <span className="text-dense tabular-nums text-muted-foreground shrink-0">
              {formatRelativeTime(item.timestamp)}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 min-w-0">
            <TruncatedText
              text={item.subject || "(no subject)"}
              className={cn(
                "text-xs flex-1 min-w-0",
                item.isRead ? "text-foreground/70" : "font-semibold text-foreground",
              )}
            />
            {item.hasAttachments && (
              <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden />
            )}
          </div>
          {item.snippet && (
            <TruncatedText
              text={item.snippet}
              className="text-dense text-muted-foreground mt-0.5 min-w-0"
            />
          )}
        </div>
      </div>
    </button>
  );
}

interface ApprovalItemCardProps {
  item: BuildApprovalInboxItem;
  onClick: (item: BuildApprovalInboxItem) => void;
}

function ApprovalItemCard({ item, onClick }: ApprovalItemCardProps) {
  const handleClick = useCallback(() => onClick(item), [item, onClick]);
  const isPending = item.status === "pending";
  return (
    <button
      type="button"
      className="w-full text-left rounded-xl border border-border/70 bg-card p-3 transition-colors hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={handleClick}
      aria-label={`Approval request: ${item.subject}`}
    >
      <div className="flex items-start gap-2 min-w-0">
        {isPending ? (
          <Clock className="h-4 w-4 text-status-warning-ink shrink-0 mt-0.5" aria-hidden />
        ) : (
          <CheckCircle className="h-4 w-4 text-status-success-ink shrink-0 mt-0.5" aria-hidden />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 min-w-0">
            <TruncatedText
              text={item.subject}
              className="text-label font-medium text-foreground min-w-0"
            />
            <span className="text-dense tabular-nums text-muted-foreground shrink-0">
              {formatRelativeTime(item.timestamp)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="h-4 px-1.5 py-0 text-micro">
              {item.status}
            </Badge>
            {item.dueAt && (
              <span className="text-dense text-muted-foreground tabular-nums">
                Due {formatRelativeTime(item.dueAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export interface InboxItemCardProps {
  item: UnifiedInboxItem;
  onNotificationClick: (n: { id: number; isRead: boolean; link: string | null }) => void;
  onMailClick: (item: MailInboxItem) => void;
  onApprovalClick: (item: BuildApprovalInboxItem) => void;
  onArchive?: (id: number) => void;
  onDelete?: (id: number) => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
  isArchiving?: boolean;
  isDeleting?: boolean;
}

export const InboxItemCard = memo(function InboxItemCard({
  item,
  onNotificationClick,
  onMailClick,
  onApprovalClick,
  onArchive,
  onDelete,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
  isArchiving,
  isDeleting,
}: InboxItemCardProps) {
  switch (item.kind) {
    case "notification":
      return (
        <NotificationCard
          id={item.id}
          title={item.subject}
          message={item.body}
          type={item.notifType}
          priority={item.priority}
          category={item.category}
          sourceModule={item.sourceModule}
          isRead={item.isRead}
          pinned={item.pinned}
          archivedAt={null}
          createdAt={item.timestamp}
          link={item.deepLink}
          isApproval={false}
          isApproving={isApproving}
          isRejecting={isRejecting}
          isArchiving={isArchiving}
          isDeleting={isDeleting}
          onClick={onNotificationClick}
          onArchive={onArchive}
          onDelete={onDelete}
          onApprove={onApprove}
          onReject={onReject}
        />
      );
    case "broadcast":
      return (
        <NotificationCard
          id={item.id}
          title={item.subject}
          message={item.body}
          type={item.notifType}
          priority={item.priority}
          category={item.category}
          sourceModule={item.sourceModule}
          isRead={item.isRead}
          pinned={false}
          archivedAt={null}
          createdAt={item.timestamp}
          link={item.deepLink}
          isApproval={false}
          onClick={onNotificationClick}
        />
      );
    case "mail":
      return <MailItemCard item={item} onClick={onMailClick} />;
    case "build_approval":
      return <ApprovalItemCard item={item} onClick={onApprovalClick} />;
    default:
      return assertNever(item);
  }
});
