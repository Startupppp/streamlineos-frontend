"use client";

import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle2, XCircle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { formatDistanceToNow } from "date-fns";

const TYPE_CONFIG = {
  INFO: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10" },
  SUCCESS: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  WARNING: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  ERROR: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
} as const;

export function NotificationBell() {
  const utils = api.useUtils();
  const { data: countData } = api.notifications.getUnreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: notifications } = api.notifications.getAll.useQuery({ limit: 20 });

  const markRead = api.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.getUnreadCount.invalidate();
      utils.notifications.getAll.invalidate();
    },
  });

  const markAllRead = api.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.getUnreadCount.invalidate();
      utils.notifications.getAll.invalidate();
    },
  });

  const deleteOne = api.notifications.deleteOne.useMutation({
    onSuccess: () => {
      utils.notifications.getUnreadCount.invalidate();
      utils.notifications.getAll.invalidate();
    },
  });

  const clearAll = api.notifications.clearAll.useMutation({
    onSuccess: () => {
      utils.notifications.getUnreadCount.invalidate();
      utils.notifications.getAll.invalidate();
    },
  });

  const unreadCount = countData?.count || 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 max-h-[70vh] flex flex-col" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h4 className="text-sm font-semibold">Notifications</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => markAllRead.mutate()}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Read all
              </Button>
            )}
            {(notifications?.length ?? 0) > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => clearAll.mutate()}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {!notifications?.length ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const config = TYPE_CONFIG[n.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.INFO;
                const Icon = config.icon;

                return (
                  <button
                    key={n.id}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors group/notif",
                      !n.isRead && "bg-primary/5"
                    )}
                    onClick={() => {
                      if (!n.isRead) markRead.mutate({ id: n.id });
                      if (n.link) window.location.href = n.link;
                    }}
                  >
                    <div className={cn("mt-0.5 h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0", config.bg)}>
                      <Icon className={cn("h-3.5 w-3.5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm line-clamp-1", !n.isRead && "font-medium")}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {n.createdAt
                          ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1 shrink-0 ml-1">
                      {!n.isRead && (
                        <div className="h-2 w-2 rounded-full bg-[#bd882c]" />
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteOne.mutate({ id: n.id }); }}
                        className="opacity-0 group-hover/notif:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-500"
                        aria-label="Delete notification"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
