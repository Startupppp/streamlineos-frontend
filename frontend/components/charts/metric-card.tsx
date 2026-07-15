"use client";

import type { TrendValue } from "@/types/crm/deals";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: TrendValue;
  sparkData?: number[];
  sparkColor?: string;
}

export function MetricCard({
  label,
  value,
  icon,
  trend,
  sparkData,
  sparkColor,
}: MetricCardProps) {
  return (
    <StatCard
      label={label}
      value={value}
      icon={icon}
      trend={trend}
      sparkData={sparkData}
      sparkColor={sparkColor}
    />
  );
}

interface MetricCardGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export function MetricCardGrid({ children, cols = 4, className }: MetricCardGridProps) {
  return (
    <StatCardGrid cols={cols} className={className}>
      {children}
    </StatCardGrid>
  );
}
