"use client";

import * as React from "react";
import { EmptyState } from "@/components/ui/empty-state";
import type { Notification } from "@/types/notifications";
import {
  Bell,
  AtSign,
  UserCheck,
  GitPullRequest,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";
import type {
  NotificationType,
  NotificationCategory,
} from "@/types/notifications";
import { parseInboxTicketLink } from "./parse-inbox-ticket-link";
import { InboxTicketPreview } from "./inbox-ticket-preview";

function getCategoryLabel(category: NotificationCategory): string {
  const labels: Record<NotificationCategory, string> = {
    SECURITY: "Security",
    CRM: "CRM",
    HRMS: "HR",
    BILLING: "Billing",
    AI: "AI",
    PROJECTS: "Projects",
    WORKFLOW: "Workflows",
    MARKETING: "Marketing",
    SYSTEM: "System",
    CHAT: "Chat",
    PAYROLL: "Payroll",
    RECRUITMENT: "Recruitment",
    KNOWLEDGE: "Knowledge",
    SIGN: "SignOS",
    INVENTORY: "Inventory",
    SURVEYS: "Surveys",
    CALENDAR: "Calendar",
    SUPPORT: "Support",
  };
  return labels[category] ?? category;
}

function getTypeIcon(
  type: NotificationType,
  category: NotificationCategory,
): React.ReactNode {
  if (category === "PROJECTS")
    return <GitPullRequest className="h-5 w-5 text-primary/70" />;
  if (category === "CHAT") return <AtSign className="h-5 w-5 text-primary" />;
  if (category === "HRMS")
    return <UserCheck className="h-5 w-5 text-muted-foreground" />;
  if (type === "SUCCESS")
    return <CheckCircle className="h-5 w-5 text-emerald-500" />;
  if (type === "WARNING")
    return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  if (type === "ERROR")
    return <AlertCircle className="h-5 w-5 text-destructive" />;
  if (type === "INFO")
    return <Info className="h-5 w-5 text-muted-foreground" />;
  return <Bell className="h-5 w-5 text-muted-foreground" />;
}

interface InboxPreviewPaneProps {
  notification: Notification | null;
  onClose?: () => void;
}

function NotificationFallbackPreview({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose?: () => void;
}) {
  const createdAt =
    typeof notification.createdAt === "string"
      ? new Date(notification.createdAt)
      : notification.createdAt;

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-y-auto scrollbar-hide">
      <div className="shrink-0 border border-l-0 border-border px-4 pb-4 pt-4 md:px-6 md:pt-6">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted",
            )}
          >
            {getTypeIcon(notification.type, notification.category)}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <h2 className="break-words text-[15px] font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">
              {notification.title}
            </h2>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {getCategoryLabel(notification.category)}
              </span>
              <span className="text-xs text-muted-foreground/40">·</span>
              <span
                className="tabular-nums text-xs text-muted-foreground"
                title={format(createdAt, "PPpp")}
              >
                {formatDistanceToNow(createdAt, { addSuffix: true })}
              </span>
              {!notification.isRead && (
                <>
                  <span className="text-xs text-muted-foreground/40">·</span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Unread
                  </span>
                </>
              )}
            </div>
          </div>
          {onClose ? (
            <AnimatedIconButton
              type="button"
              size="icon"
              variant="ghost"
              icon={XIcon}
              iconSize={16}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={onClose}
              aria-label="Close preview"
            />
          ) : null}
        </div>
      </div>

      <div className="min-w-0 flex-1 px-4 py-4 md:px-6">
        {notification.message && (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">
            {notification.message}
          </p>
        )}

        {notification.link && (
          <div className="mt-5">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
            >
              <Link href={notification.link}>
                <ExternalLink className="h-3.5 w-3.5" />
                View in app
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function InboxPreviewPane({
  notification,
  onClose,
}: InboxPreviewPaneProps) {
  if (!notification)
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col p-4">
        <EmptyState
          illustrationPreset="mail"
          title="Select a notification"
          description="Choose a notification from the list to view its details here."
          compact={false}
        />
      </div>
    );

  const ticketTarget = parseInboxTicketLink(notification.link);

  if (ticketTarget)
    return (
      <InboxTicketPreview
        key={notification.id}
        target={ticketTarget}
        onClose={onClose}
      />
    );

  return (
    <NotificationFallbackPreview
      notification={notification}
      onClose={onClose}
    />
  );
}
