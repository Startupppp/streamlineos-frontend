"use client";

import { motion } from "framer-motion";
import {
  Bell, Check, CheckCheck, Info, CheckCircle, AlertTriangle,
  AlertCircle, ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vaivammTrpcClient } from "@/lib/trpc";
import { toast } from "sonner";
import Link from "next/link";

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  INFO: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10" },
  SUCCESS: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  WARNING: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
  ERROR: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifs, isLoading } = useQuery({
    queryKey: ["vaivamm", "notifications"],
    queryFn: () => vaivammTrpcClient.notifications.getAll.query(),
  });

  const { data: unreadCount } = useQuery({
    queryKey: ["vaivamm", "notifications", "unreadCount"],
    queryFn: () => vaivammTrpcClient.notifications.getUnreadCount.query(),
  });

  const markAsRead = useMutation({
    mutationFn: (id: number) => vaivammTrpcClient.notifications.markAsRead.mutate({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vaivamm", "notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: () => vaivammTrpcClient.notifications.markAllAsRead.mutate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vaivamm", "notifications"] });
      toast.success("All notifications marked as read");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <PageHeader
            title="Notifications"
            description="Stay updated with lead assignments, targets, and team activity"
          />
          {unreadCount != null && unreadCount > 0 && (
            <Badge className="bg-red-500 text-white">{unreadCount} new</Badge>
          )}
        </div>
        {unreadCount != null && unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </motion.div>

      <motion.div variants={fadeUp}>
        {notifs && notifs.length > 0 ? (
          <div className="space-y-2">
            {notifs.map((notif) => {
              const config = TYPE_CONFIG[notif.type ?? "INFO"] || TYPE_CONFIG.INFO;
              const NotifIcon = config.icon;

              return (
                <motion.div
                  key={notif.id}
                  variants={fadeUp}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-xl border transition-colors",
                    notif.isRead
                      ? "bg-muted/10 border-border/30 opacity-70"
                      : "bg-muted/30 border-border/50 hover:border-gold/30"
                  )}
                >
                  <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0", config.bg)}>
                    <NotifIcon className={cn("h-4 w-4", config.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={cn("text-sm font-medium", !notif.isRead && "text-foreground")}>
                          {notif.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">{notif.message}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!notif.isRead && (
                          <button
                            onClick={() => markAsRead.mutate(notif.id)}
                            className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                            aria-label="Mark as read"
                          >
                            <Check className="h-3 w-3 text-muted-foreground" />
                          </button>
                        )}
                        {notif.link && (
                          <Link href={notif.link} className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </Link>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                    </p>
                  </div>

                  {!notif.isRead && (
                    <div className="h-2 w-2 rounded-full bg-gold shrink-0 mt-2" />
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card className="shadow-noir">
            <CardContent className="py-16 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">You will see lead assignments and updates here</p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}
