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

export function OverviewWidget({ activeProjects, openIssues, overdueIssues }: OverviewWidgetProps) {
  const shouldReduceMotion = useReducedMotion();
  const hover = shouldReduceMotion ? undefined : { y: -2 };
  return (
    <div className="h-full min-h-0 min-w-0 w-full max-w-full">
      <StatCardGrid cols={3} stackOnMobile={2} className="max-[359px]:grid-cols-1">
        <motion.div whileHover={hover} transition={pmSnappy}>
          <StatCard label="Projects" value={activeProjects} icon={Briefcase} tone="default" index={0} href="/build/projects" />
        </motion.div>
        <motion.div whileHover={hover} transition={pmSnappy}>
          <StatCard label="Open issues" value={openIssues} icon={CheckSquare} tone="default" index={1} href="/build/my-work" />
        </motion.div>
        <motion.div
          whileHover={hover}
          transition={pmSnappy}
          animate={overdueIssues > 0 && !shouldReduceMotion ? { scale: [1, 1.015, 1] } : undefined}
        >
          <StatCard
            label="Overdue"
            value={overdueIssues}
            icon={AlertCircle}
            tone={overdueIssues > 0 ? "red" : "default"}
            index={2}
            href="/build/my-work"
          />
        </motion.div>
      </StatCardGrid>
    </div>
  );
}
