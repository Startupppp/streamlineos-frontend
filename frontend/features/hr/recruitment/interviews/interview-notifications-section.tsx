"use client";

import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";

interface InterviewNotificationsSectionProps {
  notifyEmail: boolean;
  notifyWhatsApp: boolean;
  onEmailChange: (checked: boolean) => void;
  onWhatsAppChange: (checked: boolean) => void;
}

export function InterviewNotificationsSection({
  notifyEmail,
  notifyWhatsApp,
  onEmailChange,
  onWhatsAppChange,
}: InterviewNotificationsSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Bell className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-semibold text-foreground">
          Notifications
        </span>
      </div>
      <div className="rounded-2xl border border-border bg-muted/30 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <div>
            <p className="text-sm font-medium text-foreground">Email</p>
            <p className="text-[11px] text-muted-foreground">
              Notify via email
            </p>
          </div>
          <Switch
            checked={notifyEmail}
            onCheckedChange={onEmailChange}
            aria-label="Send email notifications"
          />
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">WhatsApp</p>
            <p className="text-[11px] text-muted-foreground">
              Requires Twilio configuration
            </p>
          </div>
          <Switch
            checked={notifyWhatsApp}
            onCheckedChange={onWhatsAppChange}
            aria-label="Send WhatsApp notifications"
          />
        </div>
      </div>
    </div>
  );
}
