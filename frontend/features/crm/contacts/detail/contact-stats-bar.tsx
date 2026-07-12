"use client";

import { useMemo } from "react";
import { TrendingUp, Activity, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { StatCard } from "@/components/ui/stat-card";
import { useTasks } from "@/hooks/api/tasks";

interface ContactStatsBarProps {
  contactId: number;
  openDealsCount: number;
}

export function ContactStatsBar({ contactId, openDealsCount }: ContactStatsBarProps) {
  const { data } = useTasks({ entityType: "CONTACT", entityId: contactId, limit: 50 });

  const { activitiesThisMonth, lastContacted } = useMemo(() => {
    const tasks = data?.tasks ?? [];
    const now = new Date();

    const monthly = tasks.filter((t) => {
      if (!t.createdAt) return false;
      const d = new Date(t.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const lastDone = tasks
      .filter((t) => t.status === "completed" && t.completedAt)
      .sort(
        (a, b) =>
          new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime(),
      )[0]?.completedAt ?? null;

    return { activitiesThisMonth: monthly, lastContacted: lastDone };
  }, [data]);

  const lastContactedLabel = lastContacted
    ? formatDistanceToNow(new Date(lastContacted), { addSuffix: true })
    : "Never";

  return (
    <motion.div
      className="grid grid-cols-3 gap-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: 0.08 }}
    >
      <StatCard
        label="Open Deals"
        value={openDealsCount}
        icon={TrendingUp}
        color="blue"
        index={0}
      />
      <StatCard
        label="Activities"
        value={activitiesThisMonth}
        icon={Activity}
        color="blue"
        hint="This month"
        index={1}
      />
      <StatCard
        label="Last Contact"
        value={lastContactedLabel}
        icon={Clock}
        color="amber"
        index={2}
      />
    </motion.div>
  );
}
