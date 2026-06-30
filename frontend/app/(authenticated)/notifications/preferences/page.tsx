"use client";

import { useCallback } from "react";
import { Bell, Mail, Smartphone, MessageSquare, Slack, Volume2, Moon } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/api/notifications";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_CONFIG,
} from "@/features/notifications/notification-types";
import type { UpdatePreferencesInput, DigestMode } from "@/types/notifications";

const CHANNELS = [
  { key: "inAppEnabled" as const, label: "In-App", description: "Notifications inside the app", icon: Bell },
  { key: "emailEnabled" as const, label: "Email", description: "Delivered to your inbox", icon: Mail },
  { key: "pushEnabled" as const, label: "Push", description: "Browser & mobile push alerts", icon: Smartphone },
  { key: "smsEnabled" as const, label: "SMS", description: "Text messages to your phone", icon: MessageSquare },
  { key: "whatsappEnabled" as const, label: "WhatsApp", description: "Messages via WhatsApp", icon: MessageSquare },
  { key: "slackEnabled" as const, label: "Slack", description: "Posts to your Slack workspace", icon: Slack },
  { key: "teamsEnabled" as const, label: "Teams", description: "Posts to Microsoft Teams", icon: MessageSquare },
  { key: "soundEnabled" as const, label: "Sound", description: "Play sound for new notifications", icon: Volume2 },
];

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "America/New_York", label: "US Eastern (ET)" },
  { value: "America/Los_Angeles", label: "US Pacific (PT)" },
  { value: "Europe/London", label: "UK (GMT/BST)" },
  { value: "Europe/Paris", label: "Central Europe (CET)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Australia/Sydney", label: "Australia Eastern (AEST)" },
];

const DIGEST_OPTIONS: Array<{ value: DigestMode; label: string }> = [
  { value: "disabled", label: "Off — deliver immediately" },
  { value: "hourly", label: "Hourly digest" },
  { value: "daily", label: "Daily digest" },
  { value: "weekly", label: "Weekly digest" },
];

export default function NotificationPreferencesPage() {
  const { data: prefs, isLoading, isError, refetch } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  const handleChannelToggle = useCallback(
    (key: keyof UpdatePreferencesInput, value: boolean) => {
      updatePreferences.mutate(
        { [key]: value },
        {
          onSuccess: () => toast.success("Preferences saved"),
          onError: () => toast.error("Failed to save preferences"),
        },
      );
    },
    [updatePreferences],
  );

  const handleQuietHours = useCallback(
    (field: "quietHoursStart" | "quietHoursEnd", value: string) => {
      updatePreferences.mutate(
        { [field]: value || null },
        { onError: () => toast.error("Failed to save") },
      );
    },
    [updatePreferences],
  );

  const handleTimezone = useCallback(
    (value: string) => {
      updatePreferences.mutate(
        { quietHoursTimezone: value },
        { onError: () => toast.error("Failed to save") },
      );
    },
    [updatePreferences],
  );

  const handleDigestMode = useCallback(
    (value: string) => {
      updatePreferences.mutate(
        { digestMode: value as DigestMode },
        {
          onSuccess: () => toast.success("Digest mode updated"),
          onError: () => toast.error("Failed to save"),
        },
      );
    },
    [updatePreferences],
  );

  const handleCategoryToggle = useCallback(
    (category: string, enabled: boolean) => {
      const current = prefs?.categories ?? {};
      updatePreferences.mutate(
        { categories: { ...current, [category]: enabled } },
        { onError: () => toast.error("Failed to save") },
      );
    },
    [prefs?.categories, updatePreferences],
  );

  function handleRetry() {
    void refetch();
  }

  if (isLoading) {
    return (
      <PageWrapper title="Notification Preferences" subtitle="Control how and when you receive notifications">
        <div className="space-y-6">
          <Skeleton className="h-6 w-24" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-6 w-24 mt-4" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Notification Preferences">
        <ErrorState
          title="Failed to load preferences"
          description="Could not load your notification preferences."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Notification Preferences"
      subtitle="Control how and when you receive notifications"
    >
      <div className="space-y-8 max-w-4xl">
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Channels</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CHANNELS.map(({ key, label, description, icon: Icon }) => {
              const enabled = prefs ? (prefs[key as keyof typeof prefs] as boolean) : false;
              return (
                <Card
                  key={key}
                  className={cn(
                    "transition-colors",
                    enabled ? "border-blue-400/40 bg-blue-500/[0.02]" : "",
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", enabled ? "bg-blue-500/10" : "bg-muted")}>
                          <Icon className={cn("h-4 w-4", enabled ? "text-blue-600" : "text-muted-foreground")} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-[11px] text-muted-foreground leading-tight">{description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(v) => handleChannelToggle(key, v)}
                        disabled={updatePreferences.isPending}
                        className="shrink-0 mt-0.5"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Quiet Hours</h2>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-2 mb-4">
                <Moon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Suppress non-critical notifications during the specified window. Critical security notifications always go through.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Start time</Label>
                  <input
                    type="time"
                    defaultValue={prefs?.quietHoursStart ?? ""}
                    onBlur={(e) => handleQuietHours("quietHoursStart", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">End time</Label>
                  <input
                    type="time"
                    defaultValue={prefs?.quietHoursEnd ?? ""}
                    onBlur={(e) => handleQuietHours("quietHoursEnd", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Timezone</Label>
                  <Select
                    value={prefs?.quietHoursTimezone ?? "UTC"}
                    onValueChange={handleTimezone}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Digest Mode</h2>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Notification digest</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Bundle low-priority notifications into a single periodic digest instead of individual alerts.
                  </p>
                </div>
                <Select
                  value={prefs?.digestMode ?? "disabled"}
                  onValueChange={handleDigestMode}
                >
                  <SelectTrigger className="w-52 shrink-0 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIGEST_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Categories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {NOTIFICATION_CATEGORIES.map((cat) => {
              const config = NOTIFICATION_CATEGORY_CONFIG[cat];
              const Icon = config.icon;
              const enabled = prefs?.categories?.[cat] !== false;
              return (
                <Card key={cat} className={cn(!enabled && "opacity-60")}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("h-7 w-7 rounded-md flex items-center justify-center shrink-0", config.bg)}>
                          <Icon className={cn("h-3.5 w-3.5", config.color)} />
                        </div>
                        <p className="text-sm font-medium">{config.label}</p>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(v) => handleCategoryToggle(cat, v)}
                        disabled={updatePreferences.isPending}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
