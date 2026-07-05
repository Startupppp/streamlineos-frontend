"use client";

import { useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  useOrgFeatureFlags,
  useUpdateFeatureFlag,
  useAiUsage,
  type OrgFeatureFlags,
} from "@/hooks/api/ai";
import { BarChart3, Bot, BrainCircuit, TrendingUp, Zap } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/shared/error-state";

const FLAG_META: {
  key: keyof OrgFeatureFlags;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: "aiChat",
    label: "AI Chat Assistant",
    description: "Context-aware chat that can answer questions about your leads, deals, and tasks.",
    icon: Bot,
  },
  {
    key: "aiLeadScoring",
    label: "AI Lead Scoring",
    description: "Automatically score leads using AI based on their profile and activity.",
    icon: TrendingUp,
  },
  {
    key: "aiEmailDraft",
    label: "AI Email Draft",
    description: "Generate follow-up email drafts from lead context with one click.",
    icon: Zap,
  },
  {
    key: "aiSmartNotifications",
    label: "Smart Notifications",
    description: "AI-enriched notification text with lead context and suggested actions.",
    icon: BrainCircuit,
  },
  {
    key: "aiWeeklyRecap",
    label: "AI Weekly Recap",
    description: "Generate a narrative CEO recap from weekly metrics automatically.",
    icon: BarChart3,
  },
];

function formatCost(usd: string): string {
  const val = parseFloat(usd);
  if (val === 0) return "$0.00";
  if (val < 0.01) return `$${val.toFixed(4)}`;
  return `$${val.toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface FlagRowProps {
  flagKey: keyof OrgFeatureFlags;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  checked: boolean;
  disabled: boolean;
  onToggle: (flag: keyof OrgFeatureFlags, enabled: boolean) => void;
}

function FlagRow({ flagKey, label, description, icon: Icon, checked, disabled, onToggle }: FlagRowProps) {
  const handleChange = useCallback(
    (enabled: boolean) => onToggle(flagKey, enabled),
    [flagKey, onToggle],
  );

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={handleChange} disabled={disabled} />
    </div>
  );
}

export function CrmAiSettings() {
  const { data: flags, isLoading: flagsLoading, isError: flagsError, refetch: refetchFlags } = useOrgFeatureFlags();
  const { data: usage, isLoading: usageLoading, isError: usageError, refetch: refetchUsage } = useAiUsage();
  const updateFlag = useUpdateFeatureFlag();

  function handleRetryFlags() {
    void refetchFlags();
  }

  function handleRetryUsage() {
    void refetchUsage();
  }

  const handleToggle = useCallback(
    (flag: keyof OrgFeatureFlags, enabled: boolean) => {
      updateFlag.mutate({ flag, enabled });
    },
    [updateFlag],
  );

  return (
    <PageWrapper
      title="AI Settings"
      subtitle="Manage CRM AI features and monitor token usage across your organization."
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Feature Flags
            </CardTitle>
            <CardDescription>
              Enable or disable AI features for your organization. Changes take effect immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {flagsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))
            ) : flagsError ? (
              <ErrorState
                compact
                title="Failed to load AI feature flags"
                description="Something went wrong while fetching AI feature configuration."
                onRetry={handleRetryFlags}
              />
            ) : (
              FLAG_META.map(({ key, label, description, icon }) => (
                <FlagRow
                  key={key}
                  flagKey={key}
                  label={label}
                  description={description}
                  icon={icon}
                  checked={flags?.[key] ?? true}
                  disabled={updateFlag.isPending}
                  onToggle={handleToggle}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              AI Usage (All Time)
            </CardTitle>
            <CardDescription>
              Token consumption and estimated cost broken down by feature.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usageLoading ? (
              <StatCardGrid cols={4}>
                <StatCard label="Total Requests" value={0} isLoading tone="blue" />
                <StatCard label="Total Tokens" value={0} isLoading tone="default" />
                <StatCard label="Prompt Tokens" value={0} isLoading tone="default" />
                <StatCard label="Est. Cost" value={0} isLoading tone="emerald" />
              </StatCardGrid>
            ) : usageError ? (
              <ErrorState
                compact
                title="Failed to load usage data"
                description="Something went wrong while fetching AI usage statistics."
                onRetry={handleRetryUsage}
              />
            ) : (
              <div className="space-y-6">
                <StatCardGrid cols={4}>
                  <StatCard label="Total Requests" value={String(usage?.totals.requestCount ?? 0)} tone="blue" />
                  <StatCard label="Total Tokens" value={formatTokens(usage?.totals.totalTokens ?? 0)} tone="default" />
                  <StatCard label="Prompt Tokens" value={formatTokens(usage?.totals.promptTokens ?? 0)} tone="default" />
                  <StatCard label="Est. Cost" value={formatCost(usage?.totals.estimatedCostUsd ?? "0")} tone="emerald" />
                </StatCardGrid>

                {(usage?.byFeature.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-3 text-sm font-medium">By Feature</p>
                    <div className="space-y-2">
                      {usage?.byFeature.map((row) => (
                        <div
                          key={`${row.feature}-${row.model}`}
                          className="flex items-center justify-between rounded border px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium capitalize">
                              {row.feature.replace(/_/g, " ")}
                            </span>
                            <Badge variant="secondary" className="text-[10px]">
                              {row.model}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{row.requestCount} req</span>
                            <span>{formatTokens(row.totalTokens)} tokens</span>
                            <span className="font-medium text-foreground">
                              {formatCost(row.estimatedCostUsd)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(usage?.byFeature.length ?? 0) === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No AI usage recorded yet.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
