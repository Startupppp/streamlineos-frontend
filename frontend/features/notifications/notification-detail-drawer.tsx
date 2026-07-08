"use client";

import { useCallback } from "react";
import { Archive, ArchiveRestore, Pin, PinOff, Trash2, ExternalLink, Clock, Info, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  NOTIFICATION_CATEGORY_CONFIG,
  NOTIFICATION_PRIORITY_CONFIG,
  type NotificationCategory,
  type NotificationPriority,
} from "./notification-types";
import { formatRelativeTime } from "./format-relative-time";
import type { Notification } from "@/types/notifications";

interface NotificationDetailDrawerProps {
  notification: Notification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenLink: (link: string) => void;
  onMarkRead: (id: number) => void;
  onArchive: (id: number) => void;
  onUnarchive: (id: number) => void;
  onPin: (id: number, pinned: boolean) => void;
  onSnooze: (id: number, snoozedUntil: string) => void;
  onDelete: (id: number) => void;
}

function buildReason(n: Notification): string {
  if (n.reason) return n.reason;
  const category = (n.category ?? "SYSTEM").toString().toLowerCase();
  const base = n.sourceModule
    ? `This is a ${category} update from ${n.sourceModule}.`
    : `This is a ${category} notification.`;
  if (n.priority === "CRITICAL" || n.priority === "HIGH") {
    return `${base} It was flagged ${n.priority.toLowerCase()} priority, so it's surfaced prominently.`;
  }
  return base;
}

function formatFullDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const SNOOZE_PRESETS: Array<{ label: string; getIso: () => string }> = [
  { label: "1 hour", getIso: () => new Date(Date.now() + 60 * 60 * 1000).toISOString() },
  { label: "3 hours", getIso: () => new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() },
  {
    label: "Tomorrow, 9:00 AM",
    getIso: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d.toISOString();
    },
  },
];

export function NotificationDetailDrawer({
  notification,
  open,
  onOpenChange,
  onOpenLink,
  onMarkRead,
  onArchive,
  onUnarchive,
  onPin,
  onSnooze,
  onDelete,
}: NotificationDetailDrawerProps) {
  const handleDelete = useCallback(() => {
    if (!notification) return;
    onDelete(notification.id);
    onOpenChange(false);
  }, [notification, onDelete, onOpenChange]);

  const handleArchiveToggle = useCallback(() => {
    if (!notification) return;
    if (notification.archivedAt) {
      onUnarchive(notification.id);
    } else {
      onArchive(notification.id);
      onOpenChange(false);
    }
  }, [notification, onArchive, onUnarchive, onOpenChange]);

  const handleOpen = useCallback(() => {
    if (!notification?.link) return;
    onOpenLink(notification.link);
    onOpenChange(false);
  }, [notification, onOpenLink, onOpenChange]);

  if (!notification) return null;

  const categoryKey = (notification.category ?? "SYSTEM") as NotificationCategory;
  const priorityKey = (notification.priority ?? "NORMAL") as NotificationPriority;
  const categoryConfig = NOTIFICATION_CATEGORY_CONFIG[categoryKey] ?? NOTIFICATION_CATEGORY_CONFIG.SYSTEM;
  const priorityConfig = NOTIFICATION_PRIORITY_CONFIG[priorityKey] ?? NOTIFICATION_PRIORITY_CONFIG.NORMAL;
  const Icon = categoryConfig.icon;
  const isArchived = !!notification.archivedAt;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="px-4 py-3 border-b border-border space-y-0">
          <div className="flex items-start gap-3">
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", categoryConfig.bg)}>
              <Icon className={cn("h-4 w-4", categoryConfig.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base leading-snug text-left">{notification.title}</SheetTitle>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">{categoryConfig.label}</Badge>
                {notification.sourceModule && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{notification.sourceModule}</Badge>
                )}
                <span className={cn("inline-flex items-center gap-1 text-[11px]", priorityConfig.color)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", priorityConfig.dotColor)} />
                  {priorityConfig.label}
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {notification.message && (
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{notification.message}</p>
          )}

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1">
              <Info className="h-3.5 w-3.5 text-accent" />
              Why did I get this?
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{buildReason(notification)}</p>
          </div>

          <dl className="text-xs space-y-1.5">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground shrink-0">Received</dt>
              <dd className="text-foreground text-right">
                {formatFullDate(notification.createdAt)} · {formatRelativeTime(notification.createdAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="text-foreground">
                {notification.isRead ? "Read" : "Unread"}
                {isArchived ? " · Archived" : ""}
              </dd>
            </div>
            {notification.eventKey && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground shrink-0">Event</dt>
                <dd className="text-foreground font-mono text-[11px] truncate max-w-[60%]">{notification.eventKey}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="border-t border-border px-4 py-3 space-y-2">
          {notification.link && (
            <Button className="w-full" onClick={handleOpen}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            {!notification.isRead && (
              <Button variant="outline" size="sm" onClick={() => onMarkRead(notification.id)}>
                <Check className="h-3.5 w-3.5 mr-1.5" /> Mark read
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Clock className="h-3.5 w-3.5 mr-1.5" /> Snooze
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {SNOOZE_PRESETS.map((preset) => (
                  <DropdownMenuItem
                    key={preset.label}
                    onClick={() => {
                      onSnooze(notification.id, preset.getIso());
                      onOpenChange(false);
                    }}
                  >
                    {preset.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={handleArchiveToggle}>
              {isArchived ? (
                <>
                  <ArchiveRestore className="h-3.5 w-3.5 mr-1.5" /> Unarchive
                </>
              ) : (
                <>
                  <Archive className="h-3.5 w-3.5 mr-1.5" /> Archive
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onPin(notification.id, notification.pinned)}>
              {notification.pinned ? (
                <>
                  <PinOff className="h-3.5 w-3.5 mr-1.5" /> Unpin
                </>
              ) : (
                <>
                  <Pin className="h-3.5 w-3.5 mr-1.5" /> Pin
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="col-span-2 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
