"use client";

import { memo, useCallback } from "react";
import { Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import {
  NOTIFICATION_TYPE_CONFIG,
  NOTIFICATION_CATEGORY_CONFIG,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  type NotificationType,
} from "@/lib/notification-types";
import { formatRelativeTime } from "./format-relative-time";
import { distinctNotificationBody } from "@/lib/notification-copy";
import { NotificationCardActions } from "./notification-card-actions";
import { TruncatedText } from "@/components/ui/truncated-text";
import { CARD_ACTIVATOR_CLASS, propagationShield } from "@/lib/keyboard-activation";

const NOTIFICATION_TYPES = [
  "INFO",
  "SUCCESS",
  "WARNING",
  "ERROR",
] as const satisfies readonly NotificationType[];

export interface NotificationCardProps {
  id: number;
  title: string;
  message: string | null;
  type: string | null;
  priority: string;
  category: string;
  sourceModule: string | null;
  isRead: boolean;
  pinned: boolean;
  archivedAt: Date | string | null;
  createdAt: Date | string | null;
  link?: string | null;
  selected?: boolean;
  isApproval?: boolean;
  isApproving?: boolean;
  isRejecting?: boolean;
  isArchiving?: boolean;
  isPinning?: boolean;
  isDeleting?: boolean;
  onSelect?: (id: number) => void;
  onClick: (n: { id: number; isRead: boolean; link: string | null }) => void;
  onArchive?: (id: number) => void;
  onPin?: (id: number, pinned: boolean) => void;
  onDelete?: (id: number) => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
}

function NotificationCardInner({
  id,
  title,
  message,
  type,
  priority,
  category,
  isRead,
  pinned,
  archivedAt,
  createdAt,
  link,
  selected = false,
  isApproval = false,
  isApproving = false,
  isRejecting = false,
  isArchiving = false,
  isPinning = false,
  isDeleting = false,
  onSelect,
  onClick,
  onArchive,
  onPin,
  onDelete,
  onApprove,
  onReject,
}: NotificationCardProps) {
  const categoryKey = NOTIFICATION_CATEGORIES.find((c) => c === category) ?? "SYSTEM";
  const typeKey = NOTIFICATION_TYPES.find((t) => t === type) ?? "INFO";
  const priorityKey = NOTIFICATION_PRIORITIES.find((p) => p === priority) ?? "NORMAL";

  const categoryConfig = NOTIFICATION_CATEGORY_CONFIG[categoryKey] ?? NOTIFICATION_CATEGORY_CONFIG.SYSTEM;
  const typeConfig = NOTIFICATION_TYPE_CONFIG[typeKey] ?? NOTIFICATION_TYPE_CONFIG.INFO;

  const Icon = categoryConfig.icon ?? typeConfig.icon;
  const iconColor = categoryConfig.color ?? typeConfig.iconColor;
  const iconBg = categoryConfig.bg ?? typeConfig.bg;
  const isUnread = !isRead;
  const isArchived = !!archivedAt;
  const isCritical = priorityKey === "CRITICAL";
  const body = distinctNotificationBody(title, message);
  const timestamp = formatRelativeTime(createdAt);
  const secondaryInk =
    isUnread && !isArchived
      ? "text-status-neutral-ink-strong"
      : "text-muted-foreground";

  const handleCardClick = useCallback(() => {
    onClick({ id, isRead, link: link ?? null });
  }, [id, isRead, link, onClick]);

  const handleSelectChange = useCallback((checked: boolean | "indeterminate") => {
    if (onSelect && checked !== "indeterminate") onSelect(id);
  }, [id, onSelect]);

  const handleArchive = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive?.(id);
  }, [id, onArchive]);

  const handlePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onPin?.(id, pinned);
  }, [id, pinned, onPin]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(id);
  }, [id, onDelete]);

  const handleApprove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onApprove?.(id);
  }, [id, onApprove]);

  const handleReject = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onReject?.(id);
  }, [id, onReject]);

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border border-border/70 bg-card p-3 transition-colors hover:border-primary/40 hover:shadow-md",
        isUnread && !isArchived && "bg-primary/5",
        selected && "border-primary/40 bg-primary/10",
      )}
    >
      {onSelect ? (
        <div
          className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center"
          {...propagationShield}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={handleSelectChange}
            className="h-4 w-4"
            aria-label={`Select notification: ${title}`}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          iconBg,
          isCritical && "ring-1 ring-status-danger-rule",
        )}
      >
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start gap-2">
          <button
            type="button"
            onClick={handleCardClick}
            className={cn("min-w-0 flex-1", CARD_ACTIVATOR_CLASS)}
          >
            <TruncatedText
              text={title}
              className={cn(
                "min-w-0 text-sm leading-snug text-pretty",
                isUnread && !isArchived
                  ? "font-semibold text-foreground"
                  : "font-medium text-muted-foreground",
              )}
            />
          </button>
          {pinned ? (
            <Pin className="relative z-10 mt-1 h-3.5 w-3.5 shrink-0 text-status-warning-ink" />
          ) : null}
          {isUnread && !isArchived ? (
            <span
              className="relative z-10 mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
              aria-hidden
            />
          ) : null}
        </div>

        {body ? (
          <TruncatedText
            text={body}
            lines={2}
            className={cn("mt-1 text-xs text-pretty", secondaryInk)}
          />
        ) : null}

        <div className="mt-1.5 flex min-w-0 items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "h-5 shrink-0 px-2 py-0.5 text-[10px] border-border/70",
              secondaryInk,
            )}
          >
            {categoryConfig.label}
          </Badge>
          {timestamp ? (
            <span
              className={cn(
                "shrink-0 text-dense whitespace-nowrap tabular-nums",
                secondaryInk,
              )}
            >
              {timestamp}
            </span>
          ) : null}
        </div>

        {isApproval && (onApprove || onReject) ? (
          <div
            className="relative z-10 mt-2 flex items-center gap-1.5"
            {...propagationShield}
          >
            {onApprove ? (
              <LoadingButton
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs border-status-success-rule text-status-success-ink hover:bg-status-success-surface hover:border-status-success-rule"
                onClick={handleApprove}
                isPending={isApproving}
              >
                Approve
              </LoadingButton>
            ) : null}
            {onReject ? (
              <LoadingButton
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
                onClick={handleReject}
                isPending={isRejecting}
              >
                Reject
              </LoadingButton>
            ) : null}
          </div>
        ) : null}
      </div>

      <NotificationCardActions
        pinned={pinned}
        isArchived={isArchived}
        isArchiving={isArchiving}
        isPinning={isPinning}
        isDeleting={isDeleting}
        onArchive={onArchive ? handleArchive : undefined}
        onPin={onPin ? handlePin : undefined}
        onDelete={onDelete ? handleDelete : undefined}
      />
    </div>
  );
}

export const NotificationCard = memo(NotificationCardInner);
