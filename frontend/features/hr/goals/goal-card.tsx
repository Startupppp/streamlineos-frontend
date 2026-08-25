"use client";

import { motion } from "framer-motion";
import { Calendar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyGoalsIllustration } from "@/components/illustrations";
import { TruncatedText } from "@/components/ui/truncated-text";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import type { HrGoal } from "@/hooks/api/hr";

const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS:
    "bg-status-info-surface text-status-info-ink border-status-info-rule",
  COMPLETED:
    "bg-status-success-surface text-status-success-ink border-status-success-rule",
  CANCELLED:
    "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  DRAFT: "bg-muted text-muted-foreground border-border",
  ON_HOLD:
    "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
};

const TYPE_COLORS: Record<string, string> = {
  OKR: "bg-muted text-foreground border-border",
  STRETCH: "bg-muted text-foreground border-border",
  text: "bg-muted text-foreground border-border",
};

function CircularProgress({ value }: { value: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(value, 100) / 100) * circ;
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      className="rotate-[-90deg]"
    >
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth="6"
      />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="6"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text
        x="36"
        y="36"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground text-xs font-semibold"
        style={{
          transform: "rotate(90deg)",
          transformOrigin: "36px 36px",
          fontSize: "11px",
        }}
      >
        {value}%
      </text>
    </svg>
  );
}

interface GoalCardProps {
  goal: HrGoal;
  index: number;
  onEditProgress: (goal: HrGoal) => void;
}

export function GoalCard({ goal, index, onEditProgress }: GoalCardProps) {
  function handleEditProgress() {
    onEditProgress(goal);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: index * 0.06 }}
      className="bg-card rounded-lg border border-border p-5 flex flex-col gap-4"
    >
      <div className="flex items-start gap-4">
        <CircularProgress value={goal.progress} />
        <div className="flex-1 min-w-0">
          <TruncatedText
            text={goal.title}
            className="font-semibold text-foreground"
          />
          {goal.description && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {goal.description}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge
              className={`text-xs ${TYPE_COLORS[goal.type] ?? "bg-muted text-muted-foreground border-border"}`}
            >
              {goal.type}
            </Badge>
            <Badge
              className={`text-xs ${STATUS_COLORS[goal.status] ?? "bg-muted text-muted-foreground border-border"}`}
            >
              {goal.status.replace("_", " ")}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="w-3.5 h-3.5" />
        <span>
          {new Date(goal.startDate).toLocaleDateString()} →{" "}
          {new Date(goal.endDate).toLocaleDateString()}
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{goal.progress}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-status-info-fill rounded-full transition-all duration-500"
            style={{ width: `${Math.min(goal.progress, 100)}%` }}
          />
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={handleEditProgress}
      >
        <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
        Update Progress
      </Button>
    </motion.div>
  );
}

interface GoalGridProps {
  goals: HrGoal[];
  onEditProgress: (g: HrGoal) => void;
}

export function GoalGrid({ goals, onEditProgress }: GoalGridProps) {
  if (goals.length === 0) {
    return (
      <EmptyState
        illustration={<EmptyGoalsIllustration className="h-32 w-32" />}
        title="No goals yet"
        description="Create your first goal to start tracking progress"
        className={CONTENT_FILL_PANEL}
      />
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {goals.map((g, i) => (
        <GoalCard key={g.id} goal={g} index={i} onEditProgress={onEditProgress} />
      ))}
    </div>
  );
}
