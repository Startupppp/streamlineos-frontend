"use client";

import { Fragment, type ReactNode } from "react";
import { CheckCircle2, CircleDot, Lock } from "lucide-react";
import { useIsBelowLg } from "@/hooks/common/use-mobile";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { CloseStep, CloseStepKey } from "../close-steps";

interface RailRowProps {
  step: CloseStep;
  index: number;
  isOpen: boolean;
  summary: string | undefined;
  onOpen: (key: CloseStepKey) => void;
}

function RailRow({ step, index, isOpen, summary, onOpen }: RailRowProps) {
  const Icon = step.state === "done" ? CheckCircle2 : step.state === "current" ? CircleDot : Lock;
  const iconClass =
    step.state === "done" ? statusToneClasses("success").ink : step.state === "current" ? "text-primary" : "text-muted-foreground";
  const detail = step.state === "locked" ? step.lockedReason : step.state === "done" ? summary : "Up next";

  function handleClick() {
    onOpen(step.key);
  }

  const body = (
    <>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-dense font-medium text-foreground">
          {index + 1}. {step.label}
        </span>
        {detail ? <span className="block truncate text-micro text-muted-foreground">{detail}</span> : null}
      </span>
    </>
  );

  if (step.state === "locked") {
    return (
      <div className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 opacity-70" aria-disabled="true">
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-current={step.state === "current" ? "step" : undefined}
      aria-expanded={isOpen}
      className={cn(
        "flex min-h-11 w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isOpen && "bg-muted",
      )}
    >
      {body}
    </button>
  );
}

interface CloseRailProps {
  steps: readonly CloseStep[];
  openKey: CloseStepKey;
  summaries: Partial<Record<CloseStepKey, string>>;
  onOpen: (key: CloseStepKey) => void;
  stage: ReactNode;
}

export function CloseRail({ steps, openKey, summaries, onOpen, stage }: CloseRailProps) {
  const stacked = useIsBelowLg();

  const rows = steps.map((step, index) => (
    <Fragment key={step.key}>
      <li>
        <RailRow step={step} index={index} isOpen={step.key === openKey} summary={summaries[step.key]} onOpen={onOpen} />
      </li>
      {stacked && step.key === openKey ? <li className="py-2">{stage}</li> : null}
    </Fragment>
  ));

  if (stacked) {
    return (
      <ol aria-label="Month close checklist" className="flex flex-col gap-1">
        {rows}
      </ol>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <ol aria-label="Month close checklist" className="flex flex-col gap-1 lg:col-span-1">
        {rows}
      </ol>
      <div className="min-w-0 lg:col-span-3">{stage}</div>
    </div>
  );
}
