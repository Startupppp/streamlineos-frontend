"use client";

import { useCallback } from "react";
import { Archive, Pin, PinOff } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import {
  NOTIFICATION_TYPE_CONFIG,
  NOTIFICATION_CATEGORY_CONFIG,
  type NotificationType,
  type NotificationCategory,
  type NotificationPriority,
} from "./notification-types";
import { formatRelativeTime } from "./format-relative-time";
import { TruncatedText } from "@/components/ui/truncated-text";

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

function TrashButton({
  onClick,
  isDeleting,
}: {
  onClick: (e: React.MouseEvent) => void;
  isDeleting?: boolean;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0 hover:text-destructive"
      onClick={onClick}
      disabled={isDeleting}
      title="Delete"
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={12} />
    </Button>
  );
}

export function NotificationCard({
  id,
  title,
  message,
  type,
  priority,
  category,
  sourceModule,
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
  const categoryKey = (category ?? "SYSTEM") as NotificationCategory;
  const typeKey = (type ?? "INFO") as NotificationType;
  const priorityKey = (priority ?? "NORMAL") as NotificationPriority;

  const categoryConfig = NOTIFICATION_CATEGORY_CONFIG[categoryKey] ?? NOTIFICATION_CATEGORY_CONFIG.SYSTEM;
  const typeConfig = NOTIFICATION_TYPE_CONFIG[typeKey] ?? NOTIFICATION_TYPE_CONFIG.INFO;

  const Icon = categoryConfig.icon ?? typeConfig.icon;
  const iconColor = categoryConfig.color ?? typeConfig.iconColor;
  const iconBg = categoryConfig.bg ?? typeConfig.bg;
  const isUnread = !isRead;
  const isArchived = !!archivedAt;
  const isCritical = priorityKey === "CRITICAL";

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

  const hasHoverActions = Boolean(
    (!isArchived && onArchive) || onPin || onDelete,
  );

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "group relative flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/40 hover:shadow-md",
        isUnread && !isArchived &&
          "bg-primary/5 hover:bg-primary/10 border-l-[3px] border-l-primary",
        selected && "bg-primary/10",
      )}
    >
      {onSelect && (
        <div
          className="flex items-center shrink-0 pt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={handleSelectChange}
            className="h-3.5 w-3.5"
          />
        </div>
      )}

      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5",
          iconBg,
          isCritical && "ring-1 ring-status-danger-rule",
        )}
      >
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>

      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 items-center gap-1.5">
          <TruncatedText
            text={title}
            className={cn(
              "min-w-0 flex-1 text-sm leading-snug",
              isUnread && !isArchived ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
            )}
          />
          {pinned && <Pin className="h-3 w-3 shrink-0 text-status-warning-ink" />}
          <Badge
            variant="outline"
            className="hidden h-4 shrink-0 px-1.5 text-micro border-border/60 text-muted-foreground sm:inline-flex"
          >
            {categoryConfig.label}
          </Badge>
          {sourceModule && (
            <Badge variant="secondary" className="hidden h-4 shrink-0 px-1.5 text-micro md:inline-flex">
              {sourceModule}
            </Badge>
          )}
        </div>

        {message && (
          <TruncatedText
            text={message}
            lines={1}
            className="text-xs text-muted-foreground mt-0.5"
          />
        )}

        {isApproval && (onApprove || onReject) && (
          <div className="flex items-center gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
            {onApprove && (
              <LoadingButton
                size="sm"
                variant="outline"
                className="h-6 text-xs px-2.5 border-status-success-rule text-status-success-ink hover:bg-status-success-surface hover:border-status-success-rule"
                onClick={handleApprove}
                isPending={isApproving}
              >
                Approve
              </LoadingButton>
            )}
            {onReject && (
              <LoadingButton
                size="sm"
                variant="outline"
                className="h-6 text-xs px-2.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
                onClick={handleReject}
                isPending={isRejecting}
              >
                Reject
              </LoadingButton>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0 self-start pt-0.5">
        {hasHoverActions && (
          <div
            className="flex items-center gap-0.5 w-0 overflow-hidden opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {!isArchived && onArchive && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={handleArchive}
                disabled={isArchiving}
                title="Archive"
              >
                <Archive className="h-3 w-3 text-muted-foreground" />
              </Button>
            )}
            {onPin && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={handlePin}
                disabled={isPinning}
                title={pinned ? "Unpin" : "Pin"}
              >
                {pinned ? (
                  <PinOff className="h-3 w-3 text-status-warning-ink" />
                ) : (
                  <Pin className="h-3 w-3 text-muted-foreground" />
                )}
              </Button>
            )}
            {onDelete && (
              <TrashButton onClick={handleDelete} isDeleting={isDeleting} />
            )}
          </div>
        )}
        <span className="text-dense text-muted-foreground/60 whitespace-nowrap tabular-nums">
          {formatRelativeTime(createdAt)}
        </span>
        {isUnread && !isArchived && (
          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
        )}
      </div>
    </div>
  );
}
