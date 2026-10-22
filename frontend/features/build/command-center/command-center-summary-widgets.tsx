"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Briefcase, CheckSquare } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { pmSnappy } from "@/lib/motion-presets";

interface OverviewWidgetProps {
  activeProjects: string | number;
  openIssues: number;
  overdueIssues: number;
}

export function OverviewWidget({
  activeProjects,
  openIssues,
  overdueIssues,
}: OverviewWidgetProps) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <div className="h-full min-h-0 min-w-0 w-full max-w-full">
      <StatCardGrid cols={3}>
        <StatCard
          label="Projects"
          value={activeProjects}
          icon={Briefcase}
          tone="default"
          index={0}
        />
        <StatCard
          label="Open issues"
          value={openIssues}
          icon={CheckSquare}
          tone="default"
          index={1}
        />
        <motion.div
          transition={pmSnappy}
          animate={
            overdueIssues > 0 && !shouldReduceMotion
              ? { scale: [1, 1.015, 1] }
              : undefined
          }
        >
          <StatCard
            label="Overdue"
            value={overdueIssues}
            icon={AlertCircle}
            tone={overdueIssues > 0 ? "red" : "default"}
            index={2}
          />
        </motion.div>
      </StatCardGrid>
    </div>
  );
}
