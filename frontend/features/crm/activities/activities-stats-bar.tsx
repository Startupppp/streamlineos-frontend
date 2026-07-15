"use client";

import { memo } from "react";
import { Phone, Mail, Video, ListTodo, AlertCircle } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";

interface ActivitiesStatsBarProps {
  total: number;
  calls: number;
  emails: number;
  meetings: number;
  pending: number;
  isLoading: boolean;
}

export const ActivitiesStatsBar = memo(function ActivitiesStatsBar({
  total,
  calls,
  emails,
  meetings,
  pending,
  isLoading,
}: ActivitiesStatsBarProps) {
  return (
    <StatCardGrid cols={5}>
      <StatCard label="Total" value={total} icon={ListTodo} tone="default" isLoading={isLoading} />
      <StatCard label="Calls" value={calls} icon={Phone} tone="blue" isLoading={isLoading} />
      <StatCard label="Emails" value={emails} icon={Mail} tone="blue" isLoading={isLoading} />
      <StatCard label="Meetings" value={meetings} icon={Video} tone="emerald" isLoading={isLoading} />
      <StatCard label="Pending" value={pending} icon={AlertCircle} tone="amber" isLoading={isLoading} />
    </StatCardGrid>
  );
});
