"use client";

import { memo } from "react";
import type { ProjectMilestone } from "@/types/projects";

interface Props {
  milestones: ProjectMilestone[];
  startOfWeek: Date;
  numDays: number;
  dayWidth: number;
  labelWidth: number;
  totalHeight: number;
}

const STATUS_FILL: Record<ProjectMilestone["status"], string> = {
  PENDING: "#f59e0b",
  ACHIEVED: "#22c55e",
  MISSED: "#ef4444",
};

const MS_PER_DAY = 86_400_000;

export const GanttMilestoneMarkers = memo(function GanttMilestoneMarkers({
  milestones,
  startOfWeek,
  numDays,
  dayWidth,
  labelWidth,
  totalHeight,
}: Props) {
  const inView = milestones.filter((m) => {
    const day = Math.floor((new Date(m.targetDate).getTime() - startOfWeek.getTime()) / MS_PER_DAY);
    return day >= 0 && day <= numDays - 1;
  });
  if (inView.length === 0) return null;

  return (
    <g pointerEvents="none">
      {inView.map((m) => {
        const day = Math.floor((new Date(m.targetDate).getTime() - startOfWeek.getTime()) / MS_PER_DAY);
        const x = labelWidth + day * dayWidth + dayWidth / 2;
        const fill = STATUS_FILL[m.status];
        return (
          <g key={m.id}>
            <title>{m.name}</title>
            <line
              x1={x} y1={40} x2={x} y2={totalHeight}
              stroke={fill} strokeWidth={1} strokeDasharray="3 2" opacity={0.5}
            />
            <polygon
              points={`${x},12 ${x + 7},21 ${x},30 ${x - 7},21`}
              fill={fill}
              opacity={0.9}
            />
          </g>
        );
      })}
    </g>
  );
});