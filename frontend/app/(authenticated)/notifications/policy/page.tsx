"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ErrorState } from "@/components/shared/error-state";
import { useNotificationPolicies, useUpsertNotificationPolicy } from "@/hooks/api/notifications";
import { useCan } from "@/hooks/api/access";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_CONFIG,
} from "@/features/notifications/notification-types";
import { getErrorMessage } from "@/lib/get-error-message";
import type { NotificationChannel, NotificationCategory, PolicyOverride } from "@/types/notifications";

const CHANNELS: Array<{ value: NotificationChannel; label: string }> = [
  { value: "IN_APP", label: "In-App" },
  { value: "EMAIL", label: "Email" },
  { value: "PUSH", label: "Push" },
  { value: "SMS", label: "SMS" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "SLACK", label: "Slack" },
  { value: "TEAMS", label: "Teams" },
  { value: "WEBHOOK", label: "Webhook" },
];

interface CategoryState {
  muted: boolean;
  channels: NotificationChannel[];
}

function buildInitialCategoryState(
  overrides: Record<string, PolicyOverride>,
): Record<NotificationCategory, CategoryState> {
  const result = {} as Record<NotificationCategory, CategoryState>;
  for (const cat of NOTIFICATION_CATEGORIES) {
    const ov = overrides[cat];
    result[cat] = {
      muted: ov?.muted ?? false,
      channels: ov?.channels ?? [],
    };
  }
  return result;
}

export default function NotificationPolicyPage() {
  const canManage = useCan("notifications:policy:manage");
  const { data: policies, isLoading, isError, refetch } = useNotificationPolicies();
  const upsert = useUpsertNotificationPolicy();

  const hydrated = useRef(false);

  const orgPolicy = policies?.find(
    (p) => p.scopeType === "ORG" && p.scopeId === null,
  ) ?? null;

  const [defaultChannels, setDefaultChannels] = useState<NotificationChannel[]>([]);
  const [canUserOverride, setCanUserOverride] = useState(true);
  const [categoryState, setCategoryState] = useState<Record<NotificationCategory, CategoryState>>(
    () => buildInitialCategoryState({}),
  );

  if (!hydrated.current && orgPolicy !== null && policies !== undefined) {
    hydrated.current = true;
    setDefaultChannels(orgPolicy.defaultChannels);
    setCanUserOverride(orgPolicy.canUserOverride);
    setCategoryState(buildInitialCategoryState(orgPolicy.categoryOverrides));
  }

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleDefaultChannelToggle = useCallback(
    (channel: NotificationChannel, checked: boolean) => {
      setDefaultChannels((prev) =>
        checked ? [...prev, channel] : prev.filter((c) => c !== channel),
      );
    },
    [],
  );

  const handleUserOverrideToggle = useCallback((checked: boolean) => {
    setCanUserOverride(checked);
  }, []);

  const handleCategoryMuteToggle = useCallback(
    (cat: NotificationCategory, checked: boolean) => {
      setCategoryState((prev) => ({
        ...prev,
        [cat]: { ...prev[cat], muted: checked },
      }));
    },
    [],
  );

  const handleCategoryChannelToggle = useCallback(
    (cat: NotificationCategory, channel: NotificationChannel, checked: boolean) => {
      setCategoryState((prev) => ({
        ...prev,
        [cat]: {
          ...prev[cat],
          channels: checked
            ? [...prev[cat].channels, channel]
            : prev[cat].channels.filter((c) => c !== channel),
        },
      }));
    },
    [],
  );

  const handleSave = useCallback(() => {
    const categoryOverrides: Record<string, PolicyOverride> = {};
    for (const cat of NOTIFICATION_CATEGORIES) {
      const state = categoryState[cat];
      if (state.muted || state.channels.length > 0) {
        const override: PolicyOverride = {};
        if (state.muted) override.muted = true;
        if (state.channels.length > 0) override.channels = state.channels;
        categoryOverrides[cat] = override;
      }
    }

    upsert.mutate(
      {
        scopeType: "ORG",
        scopeId: null,
        defaultChannels,
        canUserOverride,
        categoryOverrides,
      },
      {
        onSuccess: () => toast.success("Policy saved"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [upsert, defaultChannels, canUserOverride, categoryState]);

  if (isLoading) {
    return (
      <PageWrapper
        title="Notification Policy"
        subtitle="Configure organization-wide notification delivery defaults"
      >
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-3">
              <Skeleton className="h-4 w-40" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-56" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper
        title="Notification Policy"
        subtitle="Configure organization-wide notification delivery defaults"
      >
        <ErrorState
          title="Failed to load policy"
          description="Could not load the notification policy. Please try again."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Notification Policy"
      subtitle="Configure organization-wide notification delivery defaults"
      actions={
        canManage ? (
          <LoadingButton size="sm" onClick={handleSave} isPending={upsert.isPending} loadingText="Saving...">
            Save changes
          </LoadingButton>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <Card className="bg-card border border-border rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Default channels</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Channels the organization delivers notifications on by default.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2.5">
              {CHANNELS.map((ch) => {
                const checked = defaultChannels.includes(ch.value);
                return (
                  <div key={ch.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`default-ch-${ch.value}`}
                      checked={checked}
                      disabled={!canManage}
                      onCheckedChange={(val) =>
                        handleDefaultChannelToggle(ch.value, val === true)
                      }
                    />
                    <Label
                      htmlFor={`default-ch-${ch.value}`}
                      className="text-sm cursor-pointer select-none"
                    >
                      {ch.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">User overrides</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Control whether members can change their own channel preferences.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Switch
                id="can-user-override"
                checked={canUserOverride}
                disabled={!canManage}
                onCheckedChange={handleUserOverrideToggle}
              />
              <Label htmlFor="can-user-override" className="text-sm cursor-pointer select-none">
                Allow members to change their own channel preferences
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Category overrides</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Mute or restrict delivery channels per notification category.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {NOTIFICATION_CATEGORIES.map((cat) => {
                const config = NOTIFICATION_CATEGORY_CONFIG[cat];
                const state = categoryState[cat];
                return (
                  <div key={cat} className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{config.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Mute</span>
                        <Switch
                          id={`cat-mute-${cat}`}
                          checked={state.muted}
                          disabled={!canManage}
                          onCheckedChange={(val) =>
                            handleCategoryMuteToggle(cat, val)
                          }
                        />
                      </div>
                    </div>
                    {!state.muted && (
                      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                        {CHANNELS.map((ch) => {
                          const channelChecked = state.channels.includes(ch.value);
                          return (
                            <div key={ch.value} className="flex items-center gap-1.5">
                              <Checkbox
                                id={`cat-${cat}-ch-${ch.value}`}
                                checked={channelChecked}
                                disabled={!canManage}
                                onCheckedChange={(val) =>
                                  handleCategoryChannelToggle(cat, ch.value, val === true)
                                }
                              />
                              <Label
                                htmlFor={`cat-${cat}-ch-${ch.value}`}
                                className="text-xs cursor-pointer select-none text-muted-foreground"
                              >
                                {ch.label}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
