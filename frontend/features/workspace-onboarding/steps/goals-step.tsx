"use client";

import { useState } from "react";
import {
  TrendingUp, Users, Package, DollarSign, Headphones,
  FolderKanban, Sparkles, Building2, ChevronRight, ChevronLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Goal {
  id: string;
  label: string;
  icon: LucideIcon;
}

const GOALS: Goal[] = [
  { id: "grow-sales", label: "Grow Sales", icon: TrendingUp },
  { id: "manage-employees", label: "Manage Employees", icon: Users },
  { id: "manage-inventory", label: "Manage Inventory", icon: Package },
  { id: "finance", label: "Finance & Accounting", icon: DollarSign },
  { id: "customer-support", label: "Customer Support", icon: Headphones },
  { id: "projects", label: "Manage Projects", icon: FolderKanban },
  { id: "ai-automation", label: "AI Automation", icon: Sparkles },
  { id: "build-everything", label: "Build Everything", icon: Building2 },
];

interface GoalsStepProps {
  onNext: (goals: string[]) => void;
  onBack: () => void;
  defaultGoals?: string[];
}

export function GoalsStep({ onNext, onBack, defaultGoals = [] }: GoalsStepProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultGoals));

  function toggleGoal(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleContinue() {
    onNext([...selected]);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold">What are your main goals?</h2>
        <p className="text-sm text-muted-foreground">
          Select everything that applies. We&apos;ll tailor your workspace accordingly.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {GOALS.map((goal) => {
          const Icon = goal.icon;
          const isSelected = selected.has(goal.id);
          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => toggleGoal(goal.id)}
              className={cn(
                "flex flex-col items-start gap-2.5 p-4 rounded-xl border-2 text-left transition-all duration-150",
                "hover:border-primary/50 hover:bg-primary/5",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card",
              )}
              aria-pressed={isSelected}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  isSelected ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "text-sm font-medium leading-snug",
                  isSelected ? "text-primary" : "text-foreground",
                )}
              >
                {goal.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={selected.size === 0}
          className="flex-1"
        >
          Continue
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
