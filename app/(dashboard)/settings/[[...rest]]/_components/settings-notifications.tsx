"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/lib/api/hooks/hr";
import { toast } from "sonner";

export function SettingsNotifications() {
  const { data: notifPrefs } = useNotificationPreferences();
  const updateNotifPrefs = useUpdateNotificationPreferences();

  const notifEmail = notifPrefs?.emailNotifications ?? true;
  const notifLeave = notifPrefs?.leaveReminders ?? true;
  const notifProject = notifPrefs?.projectUpdates ?? true;

  const toggleNotif = (
    key: "emailNotifications" | "leaveReminders" | "projectUpdates",
    value: boolean
  ) => {
    updateNotifPrefs.mutate(
      { [key]: value },
      {
        onSuccess: () => toast.success("Notification preferences saved"),
        onError: () => toast.error("Failed to save preferences"),
      }
    );
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Notification Preferences</CardTitle>
        <CardDescription>Choose what notifications you receive.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
          <div className="space-y-1">
            <p className="font-medium text-foreground">Email Notifications</p>
            <p className="text-sm text-muted-foreground">
              Receive updates about your projects via email.
            </p>
          </div>
          <Switch
            id="email-notifications"
            aria-label="Toggle email notifications"
            checked={notifEmail}
            onCheckedChange={(v) => toggleNotif("emailNotifications", v)}
            disabled={updateNotifPrefs.isPending}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
          <div className="space-y-1">
            <p className="font-medium text-foreground">Leave Reminders</p>
            <p className="text-sm text-muted-foreground">
              Get reminded about pending leave approvals.
            </p>
          </div>
          <Switch
            id="leave-reminders"
            aria-label="Toggle leave reminders"
            checked={notifLeave}
            onCheckedChange={(v) => toggleNotif("leaveReminders", v)}
            disabled={updateNotifPrefs.isPending}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
          <div className="space-y-1">
            <p className="font-medium text-foreground">Project Updates</p>
            <p className="text-sm text-muted-foreground">
              Notifications when tickets are assigned or updated.
            </p>
          </div>
          <Switch
            id="project-updates"
            aria-label="Toggle project updates"
            checked={notifProject}
            onCheckedChange={(v) => toggleNotif("projectUpdates", v)}
            disabled={updateNotifPrefs.isPending}
          />
        </div>

        <p className="text-xs text-muted-foreground pt-2">
          Preferences are saved to your account and persist across sessions.
        </p>
      </CardContent>
    </Card>
  );
}
