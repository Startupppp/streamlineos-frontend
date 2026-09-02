"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_CONFIG,
} from "@/features/notifications/notification-types";
import type {
  NotificationCategory,
  NotificationChannel,
} from "@/types/notifications";
import type { CategoryState } from "./notification-policy-state";
import { NOTIFICATION_CHANNELS } from "@/features/notifications/notification-channels";

interface DefaultChannelsCardProps {
  defaultChannels: NotificationChannel[];
  canManage: boolean;
  onToggle: (channel: NotificationChannel, checked: boolean) => void;
}

export function DefaultChannelsCard({
  defaultChannels,
  canManage,
  onToggle,
}: DefaultChannelsCardProps) {
  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Default channels</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Channels the organization delivers notifications on by default.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2.5">
          {NOTIFICATION_CHANNELS.map((ch) => (
            <div key={ch.value} className="flex items-center gap-2">
              <Checkbox
                id={`default-ch-${ch.value}`}
                checked={defaultChannels.includes(ch.value)}
                disabled={!canManage}
                onCheckedChange={(val) => onToggle(ch.value, val === true)}
              />
              <Label
                htmlFor={`default-ch-${ch.value}`}
                className="text-sm cursor-pointer select-none"
              >
                {ch.label}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface UserOverridesCardProps {
  canUserOverride: boolean;
  canManage: boolean;
  onToggle: (checked: boolean) => void;
}

export function UserOverridesCard({
  canUserOverride,
  canManage,
  onToggle,
}: UserOverridesCardProps) {
  return (
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
            onCheckedChange={onToggle}
          />
          <Label
            htmlFor="can-user-override"
            className="text-sm cursor-pointer select-none"
          >
            Allow members to change their own channel preferences
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}

interface CategoryOverridesCardProps {
  categoryState: Record<NotificationCategory, CategoryState>;
  canManage: boolean;
  onMuteToggle: (cat: NotificationCategory, checked: boolean) => void;
  onChannelToggle: (
    cat: NotificationCategory,
    channel: NotificationChannel,
    checked: boolean,
  ) => void;
}

export function CategoryOverridesCard({
  categoryState,
  canManage,
  onMuteToggle,
  onChannelToggle,
}: CategoryOverridesCardProps) {
  return (
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
                      onCheckedChange={(val) => onMuteToggle(cat, val)}
                    />
                  </div>
                </div>
                {!state.muted && (
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                    {NOTIFICATION_CHANNELS.map((ch) => (
                      <div key={ch.value} className="flex items-center gap-1.5">
                        <Checkbox
                          id={`cat-${cat}-ch-${ch.value}`}
                          checked={state.channels.includes(ch.value)}
                          disabled={!canManage}
                          onCheckedChange={(val) =>
                            onChannelToggle(cat, ch.value, val === true)
                          }
                        />
                        <Label
                          htmlFor={`cat-${cat}-ch-${ch.value}`}
                          className="text-xs cursor-pointer select-none text-muted-foreground"
                        >
                          {ch.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
