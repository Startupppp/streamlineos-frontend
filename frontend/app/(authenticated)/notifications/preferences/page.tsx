"use client";

import { useCallback } from "react";
import { Bell, Mail, Smartphone, MessageSquare, Slack, Volume2, Moon, BellOff } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useSuppressions,
  useRemoveSuppression,
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

function RemoveSuppressionButton({ onClick, isPending }: { onClick: () => void; isPending: boolean }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <LoadingButton
      variant="ghost"
      size="sm"
      className="shrink-0 h-7 px-2 text-muted-foreground hover:text-destructive"
      onClick={onClick}
      isPending={isPending}
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={14} />
    </LoadingButton>
  );
}

export default function NotificationPreferencesPage() {
  const { data: prefs, isLoading, isError, refetch } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const { data: suppressions, isLoading: suppressionsLoading } = useSuppressions();
  const removeSuppression = useRemoveSuppression();

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

  const handleRemoveSuppression = useCallback(
    (id: number) => {
      removeSuppression.mutate(id, {
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [removeSuppression],
  );

  function handleRetry() {
    void refetch();
  }

  if (isLoading) {
    return (
      <PageWrapper title="Notification Preferences" subtitle="Control how and when you receive notifications">
        <div className="flex flex-1 min-h-0 flex-col gap-6">
          <Skeleton className="h-5 w-20" />
          <div className="rounded-lg border border-border overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-3 border-b border-border last:border-0">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-9 rounded-full" />
              </div>
            ))}
          </div>
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
      <div className="flex flex-1 min-h-0 flex-col gap-6">
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Channels</h2>
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            {CHANNELS.map(({ key, label, description, icon: Icon }) => {
              const enabled = prefs ? (prefs[key as keyof typeof prefs] as boolean) : false;
              return (
                <div key={key} className="flex items-center justify-between px-3 py-2.5 gap-3 bg-card">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={cn("h-4 w-4 shrink-0", enabled ? "text-primary" : "text-muted-foreground/60")} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{label}</p>
                      <p className="text-[11px] text-muted-foreground">{description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => handleChannelToggle(key, v)}
                    disabled={updatePreferences.isPending}
                    className="shrink-0"
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quiet Hours</h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-3 py-3 bg-card">
              <div className="flex items-start gap-2 mb-3">
                <Moon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Suppress non-critical notifications during this window. Critical security alerts always go through.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start time</Label>
                  <Input
                    type="time"
                    defaultValue={prefs?.quietHoursStart ?? ""}
                    onBlur={(e) => handleQuietHours("quietHoursStart", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">End time</Label>
                  <Input
                    type="time"
                    defaultValue={prefs?.quietHoursEnd ?? ""}
                    onBlur={(e) => handleQuietHours("quietHoursEnd", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Timezone</Label>
                  <Select value={prefs?.quietHoursTimezone ?? "UTC"} onValueChange={handleTimezone}>
                    <SelectTrigger className="text-sm">
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
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Digest Mode</h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-3 py-2.5 bg-card">
              <div className="min-w-0">
                <p className="text-sm font-medium">Notification digest</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bundle low-priority notifications into a single periodic digest.
                </p>
              </div>
              <Select value={prefs?.digestMode ?? "disabled"} onValueChange={handleDigestMode}>
                <SelectTrigger className="w-48 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIGEST_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Categories</h2>
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            {NOTIFICATION_CATEGORIES.map((cat) => {
              const config = NOTIFICATION_CATEGORY_CONFIG[cat];
              const Icon = config.icon;
              const enabled = prefs?.categories?.[cat] !== false;
              return (
                <div key={cat} className={cn("flex items-center justify-between px-3 py-2.5 bg-card gap-3", !enabled && "opacity-50")}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn("h-6 w-6 rounded-md flex items-center justify-center shrink-0", config.bg)}>
                      <Icon className={cn("h-3 w-3", config.color)} />
                    </div>
                    <p className="text-sm font-medium">{config.label}</p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => handleCategoryToggle(cat, v)}
                    disabled={updatePreferences.isPending}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Muted Notifications</h2>
          <div className="rounded-lg border border-border overflow-hidden">
            {suppressionsLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-card gap-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-8 w-16 rounded-md" />
                  </div>
                ))}
              </div>
            ) : !suppressions || suppressions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 bg-card text-center">
                <BellOff className="w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nothing muted</p>
                <p className="text-xs text-muted-foreground/70">
                  Mute specific notification types from the notification detail drawer.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {suppressions.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between px-3 py-2.5 bg-card gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <BellOff className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{rule.scopeKey}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5">{rule.scopeType}</Badge>
                          {rule.channel && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{rule.channel}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <RemoveSuppressionButton
                      onClick={() => handleRemoveSuppression(rule.id)}
                      isPending={removeSuppression.isPending && removeSuppression.variables === rule.id}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
