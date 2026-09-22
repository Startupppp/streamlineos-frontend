"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { AlertOctagon, CheckCircle2, Circle, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { ReadinessStage } from "@/hooks/api/payroll/readiness-schema";

const STAGE_ICON: Record<ReadinessStage["status"], typeof CheckCircle2> = {
  done: CheckCircle2,
  pending: Circle,
  blocked: AlertOctagon,
  not_applicable: MinusCircle,
};

function stageIconClass(status: ReadinessStage["status"]): string {
  if (status === "done") return statusToneClasses("success").ink;
  if (status === "blocked") return statusToneClasses("danger").ink;
  return "text-muted-foreground";
}

interface ReadinessStageListProps {
  stages: ReadinessStage[];
}

export function ReadinessStageList({ stages }: ReadinessStageListProps) {
  const doneCount = stages.filter((stage) => stage.status === "done").length;
  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-3" aria-label="Payroll readiness chain">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Handoff chain</h3>
        <span className="text-dense text-muted-foreground tabular-nums">
          {doneCount}/{stages.length}
        </span>
      </div>
      <ol className="divide-y divide-border">
        {stages.map((stage) => {
          const Icon = STAGE_ICON[stage.status];
          return (
            <li key={stage.key} className="flex items-start gap-3 py-2.5">
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", stageIconClass(stage.status))} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <p className={cn("text-sm font-medium", stage.status === "done" ? "text-muted-foreground" : "text-foreground")}>{stage.label}</p>
                  <span className="text-micro text-muted-foreground">{stage.owner.label}</span>
                  {stage.at ? (
                    <span className="text-micro text-muted-foreground tabular-nums">{format(parseISO(stage.at), "MMM d, h:mm a")}</span>
                  ) : null}
                </div>
                <p className="text-dense text-muted-foreground leading-snug">{stage.detail}</p>
              </div>
              {stage.action && stage.status !== "done" ? (
                <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs" asChild>
                  <Link href={stage.action.href}>{stage.action.label}</Link>
                </Button>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
