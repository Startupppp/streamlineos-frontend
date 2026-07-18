"use client";

import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface StepReadiness {
  title: string;
  completed: boolean;
  hasError: boolean;
}

interface ReadinessStepButtonProps {
  step: StepReadiness;
  idx: number;
  onStepClick: (index: number) => void;
}

function ReadinessStepButton({ step, idx, onStepClick }: ReadinessStepButtonProps) {
  function handleClick() { onStepClick(idx); }
  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs text-left hover:bg-muted/60 transition-colors"
    >
      {step.completed && !step.hasError ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      ) : step.hasError ? (
        <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
      ) : (
        <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
      )}
      <span className={cn("truncate", step.completed && !step.hasError ? "text-foreground" : "text-muted-foreground")}>
        {step.title}
      </span>
    </button>
  );
}

interface PublishReadinessProps {
  steps: StepReadiness[];
  onStepClick: (index: number) => void;
}

export function PublishReadiness({ steps, onStepClick }: PublishReadinessProps) {
  const readyCount = steps.filter((s) => s.completed && !s.hasError).length;
  const hasErrors = steps.some((s) => s.hasError);
  const allReady = readyCount === steps.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 text-xs font-semibold",
            allReady ? "text-emerald-600" : hasErrors ? "text-rose-600" : "text-amber-600",
          )}
        >
          {allReady ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {readyCount}/{steps.length} ready to publish
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pb-1.5">
          Publish readiness
        </p>
        <div className="space-y-0.5">
          {steps.map((step, i) => (
            <ReadinessStepButton key={step.title} step={step} idx={i} onStepClick={onStepClick} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
