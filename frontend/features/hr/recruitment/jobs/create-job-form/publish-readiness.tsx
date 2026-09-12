"use client";

import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
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
        <CheckCircle2 className="h-3.5 w-3.5 text-status-success-ink shrink-0" />
      ) : step.hasError ? (
        <AlertCircle className="h-3.5 w-3.5 text-status-danger-ink shrink-0" />
      ) : (
        <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
    <ResponsivePopover>
      <ResponsivePopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 text-xs font-semibold",
            allReady ? "text-status-success-ink" : hasErrors ? "text-status-danger-ink" : "text-status-warning-ink",
          )}
        >
          {allReady ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {readyCount}/{steps.length} ready to publish
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent align="end" className="w-64 p-2" title="Publish readiness">
        <p className="text-micro font-semibold uppercase tracking-wider text-muted-foreground px-2 pb-1.5">
          Publish readiness
        </p>
        <div className="space-y-0.5">
          {steps.map((step, i) => (
            <ReadinessStepButton key={step.title} step={step} idx={i} onStepClick={onStepClick} />
          ))}
        </div>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
