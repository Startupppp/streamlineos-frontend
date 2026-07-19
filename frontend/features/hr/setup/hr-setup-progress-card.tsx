"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { HrIconWell } from "@/features/hr/shared/hr-ui";
import { useCan } from "@/hooks/api/access";
import { useModuleChecklist } from "@/hooks/api/onboarding-flow";

export function HrSetupProgressCard() {
  const canView = useCan("hr:employees:view");
  const { data: checklist, isLoading } = useModuleChecklist("HR", canView);

  if (!canView || isLoading || !checklist || checklist.status === "completed") return null;

  const remaining = checklist.items.filter((i) => i.status !== "done" && i.status !== "skipped").length;

  return (
    <Link
      href="/hr/setup"
      className="group flex items-center gap-3 rounded-2xl border border-blue-200/60 bg-gradient-to-br from-sky-50 via-blue-50 to-blue-100/80 p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-blue-500/20 dark:from-slate-900/40 dark:via-blue-950/30 dark:to-blue-950/20 sm:p-4"
    >
      <HrIconWell tone="blue" size="lg">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
      </HrIconWell>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Finish setting up HR</p>
          <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
            {checklist.progress}%
          </span>
        </div>
        <Progress value={checklist.progress} className="mt-1.5 h-1.5" />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {remaining} {remaining === 1 ? "step" : "steps"} left
        </p>
      </div>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0"
        aria-hidden="true"
      />
    </Link>
  );
}
