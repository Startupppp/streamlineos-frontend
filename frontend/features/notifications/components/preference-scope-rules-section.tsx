"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useNotificationPreferenceRules,
  useSetNotificationPreferenceRule,
} from "@/hooks/api/notifications-preferences";
import { useEnabledModules } from "@/hooks/api/access/org-modules";
import { moduleById } from "@/lib/module-manifest";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_CONFIG,
} from "@/lib/notification-types";
import type {
  PreferenceRuleMode,
  PreferenceRuleScopeType,
  NotificationChannel,
  PreferenceRuleRow,
  SetPreferenceRuleInput,
} from "@/types/notifications";

const RULE_CHANNELS: ReadonlyArray<{ key: NotificationChannel; label: string }> = [
  { key: "IN_APP", label: "In-App" },
  { key: "EMAIL", label: "Email" },
  { key: "PUSH", label: "Push" },
];

const MODE_OPTIONS: ReadonlyArray<{ value: PreferenceRuleMode; label: string }> = [
  { value: "ON", label: "Default" },
  { value: "OFF", label: "Off" },
  { value: "DIGEST", label: "Digest" },
];

function resolveMode(
  rules: PreferenceRuleRow[],
  scopeType: PreferenceRuleScopeType,
  scopeKey: string,
  channel: NotificationChannel,
): PreferenceRuleMode {
  const rule = rules.find(
    (r) => r.scopeType === scopeType && r.scopeKey === scopeKey && r.channel === channel,
  );
  return rule?.mode ?? "ON";
}

interface ChannelCellProps {
  channel: NotificationChannel;
  channelLabel: string;
  scopeLabel: string;
  scopeType: PreferenceRuleScopeType;
  scopeKey: string;
  mode: PreferenceRuleMode;
  isPending: boolean;
  onSetRule: (input: SetPreferenceRuleInput) => void;
}

function ChannelCell({
  channel,
  channelLabel,
  scopeLabel,
  scopeType,
  scopeKey,
  mode,
  isPending,
  onSetRule,
}: ChannelCellProps) {
  const handleValueChange = useCallback(
    (value: string) => {
      const found = MODE_OPTIONS.find((opt) => opt.value === value);
      if (!found) return;
      onSetRule({ scopeType, scopeKey, channel, mode: found.value });
    },
    [onSetRule, scopeType, scopeKey, channel],
  );

  function renderModeOption({ value, label }: (typeof MODE_OPTIONS)[number]) {
    return (
      <SelectItem key={value} value={value}>
        {label}
      </SelectItem>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-center sm:justify-start sm:gap-0.5">
      <span className="text-xs text-muted-foreground">{channelLabel}</span>
      <Select value={mode} onValueChange={handleValueChange} disabled={isPending}>
        <SelectTrigger
          className="w-28"
          aria-label={`${scopeLabel} ${channelLabel} notification preference`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{MODE_OPTIONS.map(renderModeOption)}</SelectContent>
      </Select>
    </div>
  );
}

interface ScopeRowProps {
  label: string;
  scopeType: PreferenceRuleScopeType;
  scopeKey: string;
  rules: PreferenceRuleRow[];
  pendingVars: SetPreferenceRuleInput | undefined;
  onSetRule: (input: SetPreferenceRuleInput) => void;
}

function ScopeRow({ label, scopeType, scopeKey, rules, pendingVars, onSetRule }: ScopeRowProps) {
  function renderChannelCell({ key: channel, label: channelLabel }: (typeof RULE_CHANNELS)[number]) {
    const mode = resolveMode(rules, scopeType, scopeKey, channel);
    const isPending =
      !!pendingVars &&
      pendingVars.scopeType === scopeType &&
      pendingVars.scopeKey === scopeKey &&
      pendingVars.channel === channel;
    return (
      <ChannelCell
        key={channel}
        channel={channel}
        channelLabel={channelLabel}
        scopeLabel={label}
        scopeType={scopeType}
        scopeKey={scopeKey}
        mode={mode}
        isPending={isPending}
        onSetRule={onSetRule}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 px-3 py-3 bg-card sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
        {RULE_CHANNELS.map(renderChannelCell)}
      </div>
    </div>
  );
}

function renderSkeletonRow(_: unknown, i: number) {
  return (
    <div
      key={i}
      className="flex flex-col gap-3 px-3 py-3 bg-card sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <Skeleton className="h-4 w-28" />
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
    </div>
  );
}

function ScopeRulesSkeleton() {
  return (
    <>
      <section>
        <Skeleton className="h-3.5 w-44 mb-2" />
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
          {Array.from({ length: 3 }).map(renderSkeletonRow)}
        </div>
      </section>
      <section>
        <Skeleton className="h-3.5 w-40 mb-2" />
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
          {Array.from({ length: 5 }).map(renderSkeletonRow)}
        </div>
      </section>
    </>
  );
}

export function PreferenceScopeRulesSection() {
  const { data: rules, isLoading } = useNotificationPreferenceRules();
  const setRule = useSetNotificationPreferenceRule();
  const enabledModules = useEnabledModules();

  const handleSetRule = useCallback(
    (input: SetPreferenceRuleInput) => {
      setRule.mutate(input, {
        onSuccess: () => toast.success("Preference saved"),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [setRule],
  );

  if (isLoading) {
    return <ScopeRulesSkeleton />;
  }

  if (!rules) return null;

  const pendingVars = setRule.isPending ? setRule.variables : undefined;

  const moduleRows = enabledModules.map((key) => ({
    key,
    scopeKey: key.toLowerCase(),
    label: moduleById(key.toLowerCase())?.displayName ?? key,
  }));

  const categoryRows = NOTIFICATION_CATEGORIES.map((cat) => ({
    key: cat,
    scopeKey: cat,
    label: NOTIFICATION_CATEGORY_CONFIG[cat].label,
  }));

  function renderModuleRow(row: { key: string; scopeKey: string; label: string }) {
    return (
      <ScopeRow
        key={row.key}
        label={row.label}
        scopeType="MODULE"
        scopeKey={row.scopeKey}
        rules={rules}
        pendingVars={pendingVars}
        onSetRule={handleSetRule}
      />
    );
  }

  function renderCategoryRow(row: { key: string; scopeKey: string; label: string }) {
    return (
      <ScopeRow
        key={row.key}
        label={row.label}
        scopeType="CATEGORY"
        scopeKey={row.scopeKey}
        rules={rules}
        pendingVars={pendingVars}
        onSetRule={handleSetRule}
      />
    );
  }

  return (
    <>
      {moduleRows.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Per-Module Preferences
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            &ldquo;Default&rdquo; follows your global channel settings. Set Off to suppress a module on a channel, or Digest to bundle it.
          </p>
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            {moduleRows.map(renderModuleRow)}
          </div>
        </section>
      )}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Per-Source Preferences
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          &ldquo;Default&rdquo; follows your global channel settings. Set Off to suppress a source on a channel, or Digest to bundle it.
        </p>
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
          {categoryRows.map(renderCategoryRow)}
        </div>
      </section>
    </>
  );
}
