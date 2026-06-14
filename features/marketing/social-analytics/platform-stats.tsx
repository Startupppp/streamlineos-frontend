"use client";

import { Users, TrendingUp, Eye, MousePointerClick } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const PLATFORMS = [
  { value: "all", label: "All Platforms" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "Twitter" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
] as const;

export type PlatformFilter = (typeof PLATFORMS)[number]["value"];

export const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "bg-blue-500",
  twitter: "bg-sky-400",
  instagram: "bg-pink-500",
  facebook: "bg-indigo-500",
  youtube: "bg-red-500",
};

export const PLATFORM_BADGE: Record<string, string> = {
  linkedin: "text-blue-700 bg-blue-50 border-blue-200",
  twitter: "text-sky-700 bg-sky-50 border-sky-200",
  instagram: "text-pink-700 bg-pink-50 border-pink-200",
  facebook: "text-indigo-700 bg-indigo-50 border-indigo-200",
  youtube: "text-red-700 bg-red-50 border-red-200",
};

interface PlatformSummary {
  avgEngagement: number;
  totalImpressions: number;
  totalClicks: number;
  followerGrowth: number;
}

interface PlatformFilterTabsProps {
  activePlatform: PlatformFilter;
  onPlatformChange: (platform: PlatformFilter) => void;
}

export function PlatformFilterTabs({
  activePlatform,
  onPlatformChange,
}: PlatformFilterTabsProps) {
  return (
    <div className="flex gap-1 flex-wrap">
      {PLATFORMS.map((p) => (
        <button
          key={p.value}
          onClick={() => onPlatformChange(p.value)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
            activePlatform === p.value
              ? "bg-blue-500 text-white border-blue-500"
              : "bg-transparent text-muted-foreground border-border hover:border-blue-500/50"
          )}
          aria-pressed={activePlatform === p.value}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

interface PlatformStatsProps {
  isLoading: boolean;
  totalFollowers: number;
  summary: PlatformSummary;
}

export function PlatformStats({
  isLoading,
  totalFollowers,
  summary,
}: PlatformStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Followers"
        value={totalFollowers.toLocaleString()}
        icon={Users}
        color="blue"
      />
      <StatCard
        label="Avg Engagement"
        value={summary.avgEngagement.toLocaleString()}
        icon={TrendingUp}
        color="green"
      />
      <StatCard
        label="Total Impressions"
        value={summary.totalImpressions.toLocaleString()}
        icon={Eye}
        color="amber"
      />
      <StatCard
        label="Total Clicks"
        value={summary.totalClicks.toLocaleString()}
        icon={MousePointerClick}
        color="purple"
      />
    </div>
  );
}
