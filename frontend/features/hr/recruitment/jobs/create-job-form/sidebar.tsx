"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  number: number;
  title: string;
  subtitle: string;
  completed: boolean;
  active: boolean;
  hasError: boolean;
}

interface FormSidebarProps {
  steps: Step[];
  onStepClick: (index: number) => void;
}

export function FormSidebar({ steps, onStepClick }: FormSidebarProps) {
  return (
    <aside className="w-60 shrink-0 border-r bg-muted/30 flex flex-col">
      <div className="px-4 py-5 border-b">
        <h2 className="text-sm font-semibold">Create Job Opening</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Complete all sections</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {steps.map((step, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onStepClick(idx)}
            className={cn(
              "w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60",
              step.active && "bg-muted/80"
            )}
          >
            <div
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold mt-0.5 transition-colors",
                step.completed && !step.hasError
                  ? "bg-primary text-primary-foreground"
                  : step.hasError
                    ? "bg-destructive text-destructive-foreground"
                    : step.active
                      ? "bg-primary/20 text-primary ring-2 ring-primary"
                      : "bg-muted text-muted-foreground"
              )}
            >
              {step.completed && !step.hasError ? <Check className="h-3 w-3" /> : step.number}
            </div>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-xs font-medium leading-tight truncate",
                  step.active ? "text-foreground" : "text-muted-foreground",
                  step.hasError && "text-destructive"
                )}
              >
                {step.title}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight truncate mt-0.5">
                {step.subtitle}
              </p>
            </div>
          </button>
        ))}
      </nav>
    </aside>
  );
}
