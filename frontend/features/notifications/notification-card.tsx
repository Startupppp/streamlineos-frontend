"use client";

import { useCallback } from "react";
import { Archive, Pin, PinOff, Trash2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  NOTIFICATION_TYPE_CONFIG,
  NOTIFICATION_CATEGORY_CONFIG,
  type NotificationType,
  type NotificationCategory,
  type NotificationPriority,
} from "./notification-types";
import { formatRelativeTime } from "./format-relative-time";

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
  onSelect?: (id: number) => void;
  onClick: (n: { id: number; isRead: boolean; link: string | null }) => void;
  onArchive?: (id: number) => void;
  onPin?: (id: number, pinned: boolean) => void;
  onDelete?: (id: number) => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
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

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "group relative flex items-start gap-2.5 px-3 py-2.5 cursor-pointer rounded-lg border border-transparent transition-colors hover:bg-muted/40",
        isUnread && !isArchived && "border-l-[3px] border-l-blue-500 bg-blue-50/30 hover:bg-blue-50/50",
        selected && "bg-blue-50/50 border-blue-200",
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
          isCritical && "ring-1 ring-red-500",
        )}
      >
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              "text-sm leading-snug truncate",
              isUnread && !isArchived ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
            )}
          >
            {title}
          </span>
          {pinned && <Pin className="h-3 w-3 text-amber-500 shrink-0" />}
          <Badge
            variant="outline"
            className="shrink-0 text-[10px] h-4 px-1.5 border-border/60 text-muted-foreground hidden sm:inline-flex"
          >
            {categoryConfig.label}
          </Badge>
          {sourceModule && (
            <Badge variant="secondary" className="shrink-0 text-[10px] h-4 px-1.5 hidden md:inline-flex">
              {sourceModule}
            </Badge>
          )}
          <span className="ml-auto shrink-0 text-[11px] text-muted-foreground/60 whitespace-nowrap">
            {formatRelativeTime(createdAt)}
          </span>
        </div>

        {message && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 pr-16">
            {message}
          </p>
        )}

        {isApproval && (onApprove || onReject) && (
          <div className="flex items-center gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
            {onApprove && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs px-2.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                onClick={handleApprove}
              >
                <Check className="h-3 w-3 mr-1" />
                Approve
              </Button>
            )}
            {onReject && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs px-2.5 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
                onClick={handleReject}
              >
                <X className="h-3 w-3 mr-1" />
                Reject
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2">
        {!isArchived && onArchive && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleArchive}
            title="Archive"
          >
            <Archive className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
        {onPin && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handlePin}
            title={pinned ? "Unpin" : "Pin"}
          >
            {pinned ? (
              <PinOff className="h-3 w-3 text-amber-500" />
            ) : (
              <Pin className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:text-destructive"
            onClick={handleDelete}
            title="Delete"
          >
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
      </div>

      {isUnread && !isArchived && (
        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
      )}
    </div>
  );
}
