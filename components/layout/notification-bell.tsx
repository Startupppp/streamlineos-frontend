"use client";

import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
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
                      "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
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
                    {!n.isRead && (
                      <div className="mt-2 h-2 w-2 rounded-full bg-[#bd882c] flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
