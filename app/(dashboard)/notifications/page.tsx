"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CheckCheck,
  Loader2,
} from "lucide-react";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/api/hooks/notifications";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";
type TabFilter = "ALL" | "UNREAD" | NotificationType;

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: typeof Info; color: string; bg: string; label: string }
> = {
  INFO: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    label: "Info",
  },
  SUCCESS: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    label: "Success",
  },
  WARNING: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    label: "Warning",
  },
  ERROR: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    label: "Error",
  },
};

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabFilter>("ALL");

  const isUnreadOnly = activeTab === "UNREAD";
  const { data: notifications, isLoading } = useNotifications(isUnreadOnly, 50);
  const { data: unreadData } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = unreadData?.count ?? 0;

  const filtered = (notifications ?? []).filter((n) => {
    if (activeTab === "ALL" || activeTab === "UNREAD") return true;
    return n.type === activeTab;
  });

  function handleNotificationClick(notification: {
    id: number;
    isRead: boolean;
    link: string | null;
  }) {
    if (!notification.isRead) {
      markRead.mutate(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  }

  function handleMarkAllRead() {
    markAllRead.mutate(undefined);
  }

  const tabsFilter = (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as TabFilter)}
    >
      <TabsList className="bg-card border border-border">
        <TabsTrigger value="ALL">All</TabsTrigger>
        <TabsTrigger value="UNREAD">
          Unread
          {unreadCount > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="INFO">Info</TabsTrigger>
        <TabsTrigger value="SUCCESS">Success</TabsTrigger>
        <TabsTrigger value="WARNING">Warning</TabsTrigger>
        <TabsTrigger value="ERROR">Error</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  return (
    <PageWrapper
      title="Notifications"
      subtitle="Stay up to date with everything happening in your workspace"
      actions={
        <Button
          variant="outline"
          size="sm"
          disabled={unreadCount === 0 || markAllRead.isPending}
          onClick={handleMarkAllRead}
          className="border-gold/30 text-gold hover:bg-gold/10 hover:text-gold"
        >
          {markAllRead.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCheck className="mr-2 h-4 w-4" />
          )}
          Mark all as read
          {unreadCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 bg-gold/20 text-gold text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      }
      filters={tabsFilter}
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full max-w-md" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gold/10 mb-6">
            <BellOff className="h-10 w-10 text-gold/60" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {activeTab === "UNREAD"
              ? "You're all caught up"
              : "No notifications yet"}
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            {activeTab === "UNREAD"
              ? "All your notifications have been read. Check back later for new updates."
              : "When something important happens, you'll see it here."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notification) => {
            const typeKey = (notification.type ?? "INFO") as NotificationType;
            const config = TYPE_CONFIG[typeKey];
            const Icon = config.icon;
            const isUnread = !notification.isRead;

            return (
              <Card
                key={notification.id}
                className={cn(
                  "group relative cursor-pointer transition-all duration-200 hover:shadow-md",
                  isUnread
                    ? "border-l-2 border-l-gold bg-gold/[0.03]"
                    : "opacity-75 hover:opacity-100"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-4 p-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      config.bg
                    )}
                  >
                    <Icon className={cn("h-5 w-5", config.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4
                        className={cn(
                          "text-sm truncate",
                          isUnread
                            ? "font-semibold text-foreground"
                            : "font-medium text-muted-foreground"
                        )}
                      >
                        {notification.title}
                      </h4>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 text-[10px] px-1.5 py-0",
                          config.color,
                          "border-current/20"
                        )}
                      >
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <span className="mt-1 block text-xs text-muted-foreground/60">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isUnread && (
                      <span className="flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-gold opacity-40" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
