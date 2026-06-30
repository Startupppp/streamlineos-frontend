"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  Users,
  Package,
  DollarSign,
  Headphones,
  LayoutGrid,
  Sparkles,
  Zap,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GOALS } from "../lib/constants";
import { NavButtons } from "./nav-buttons";

type StepGoalsProps = {
  goals: string[];
  onToggle: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
};

const GOAL_ICONS: Record<string, LucideIcon> = {
  sales: TrendingUp,
  hr: Users,
  inventory: Package,
  finance: DollarSign,
  support: Headphones,
  projects: LayoutGrid,
  ai: Sparkles,
  everything: Zap,
};

export function StepGoals({ goals, onToggle, onBack, onNext }: StepGoalsProps) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">Select all that apply.</p>

      <div className="grid grid-cols-2 gap-1.5">
        {GOALS.map((goal, i) => {
          const selected = goals.includes(goal.id);
          const Icon = GOAL_ICONS[goal.id] ?? Zap;
          return (
            <motion.button
              key={goal.id}
              type="button"
              role="checkbox"
              aria-checked={selected}
              onClick={() => onToggle(goal.id)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-lg border text-left text-[13px] font-medium transition-colors",
                selected
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-border bg-card text-foreground hover:border-blue-300 hover:bg-muted/40",
              )}
            >
              <Icon className={cn("h-3.5 w-3.5 shrink-0", selected ? "text-blue-600" : "text-muted-foreground")} />
              <span className="truncate">{goal.label}</span>
              {selected && (
                <Check className="h-3 w-3 text-blue-600 ml-auto shrink-0" />
              )}
            </motion.button>
          );
        })}
      </div>

      {goals.length > 0 && (
        <p className="text-[12px] text-blue-600">
          {goals.length} selected
        </p>
      )}

      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextDisabled={goals.length === 0}
      />
    </div>
  );
}
