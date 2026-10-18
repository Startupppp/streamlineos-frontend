"use client";

import { Activity, Coins, Hash } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  FILTER_SELECT_TRIGGER,
  FILTER_TOOLBAR_ROW,
} from "@/components/ui/content-fill-panel";
import type { AiCreditsUsageDays } from "@/hooks/api/ai-credits";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";

interface AiCreditsUsageToolbarProps {
  usageDays: AiCreditsUsageDays;
  usageLoading: boolean;
  requestsLabel: string;
  tokensLabel: string;
  creditsUsedLabel: string;
  onUsageDaysChange: (value: string) => void;
}

export function AiCreditsUsageToolbar({
  usageDays,
  usageLoading,
  requestsLabel,
  tokensLabel,
  creditsUsedLabel,
  onUsageDaysChange,
}: AiCreditsUsageToolbarProps) {
  return (
    <div className="flex shrink-0 flex-col gap-3">
      <div className={FILTER_TOOLBAR_ROW}>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            Period summary
          </p>
          <p className="text-xs text-muted-foreground">
            Totals for the selected range
          </p>
        </div>
        <Select value={String(usageDays)} onValueChange={onUsageDaysChange}>
          <SelectTrigger
            className={cn(FILTER_SELECT_TRIGGER, "w-fit min-w-[7rem]")}
            aria-label="Usage range"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <StatCardGrid cols={3}>
        <StatCard
          label="Requests"
          value={requestsLabel}
          icon={Activity}
          tone="blue"
          isLoading={usageLoading}
        />
        <StatCard
          label="Tokens"
          value={tokensLabel}
          icon={Hash}
          tone="default"
          isLoading={usageLoading}
        />
        <StatCard
          label="Credits used"
          value={creditsUsedLabel}
          icon={Coins}
          tone="emerald"
          isLoading={usageLoading}
        />
      </StatCardGrid>
    </div>
  );
}
