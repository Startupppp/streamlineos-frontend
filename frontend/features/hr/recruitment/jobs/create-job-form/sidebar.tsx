"use client";

import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TruncatedText } from "@/components/ui/truncated-text";

interface Step {
  number: number;
  title: string;
  subtitle: string;
  completed: boolean;
  active: boolean;
  hasError: boolean;
}

interface SidebarStepButtonProps {
  step: Step;
  idx: number;
  onStepClick: (index: number) => void;
}

function SidebarStepButton({ step, idx, onStepClick }: SidebarStepButtonProps) {
  function handleClick() { onStepClick(idx); }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-200 cursor-pointer",
        "hover:bg-muted/50",
        step.active && "bg-muted/60 border-r-2 border-primary"
      )}
    >
      <div
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-micro font-bold transition-colors duration-200",
          step.completed && !step.hasError
            ? "bg-emerald-500 text-white"
            : step.hasError
              ? "bg-rose-500 text-white"
              : step.active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground border border-border"
        )}
      >
        {step.completed && !step.hasError ? (
          <Check className="h-2.5 w-2.5" />
        ) : step.hasError ? (
          <AlertCircle className="h-2.5 w-2.5" />
        ) : (
          step.number
        )}
      </div>
      <div className="min-w-0 flex-1">
        <TruncatedText
          text={step.title}
          className={cn(
            "text-xs font-medium leading-tight",
            step.active ? "text-foreground" : "text-muted-foreground",
            step.hasError && "text-status-danger-ink"
          )}
        />
        <TruncatedText text={step.subtitle} className="text-micro text-muted-foreground/70 leading-tight mt-0.5" />
      </div>
    </button>
  );
}

interface FormSidebarProps {
  steps: Step[];
  onStepClick: (index: number) => void;
}

export function FormSidebar({ steps, onStepClick }: FormSidebarProps) {
  const completedCount = steps.filter((s) => s.completed && !s.hasError).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  return (
    <aside className="w-56 shrink-0 border-r bg-muted/20 flex flex-col">
      <div className="px-4 py-4 border-b">
        <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          Job Opening
        </p>
        <h2 className="text-sm font-semibold text-foreground">Create Posting</h2>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-micro font-semibold text-muted-foreground uppercase tracking-wider">
              Progress
            </span>
            <span className="text-micro font-semibold text-muted-foreground">
              {completedCount}/{steps.length}
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <ScrollArea hideScrollbar className="flex-1 min-h-0">
        <nav className="py-2">
        {steps.map((step, idx) => (
          <SidebarStepButton key={idx} step={step} idx={idx} onStepClick={onStepClick} />
        ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
