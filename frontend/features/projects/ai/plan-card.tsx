"use client";

import { useState, useCallback, useMemo } from "react";
import { ListChecks, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Plan } from "@/lib/billing/feature-gates";
import { usePlanFromPrompt } from "@/hooks/api/projects/ai";
import { SuggestedTaskList } from "./suggested-task-list";
import type { SuggestedTaskListItem } from "./suggested-task-list";

interface PlanCardProps {
  projectId: number;
  featureEnabled: boolean;
  requiredPlan: Plan | null;
}

export function PlanCard({ projectId, featureEnabled, requiredPlan }: PlanCardProps) {
  const [prompt, setPrompt] = useState("");
  const mutation = usePlanFromPrompt(projectId);
  const result = mutation.data;

  const handleRun = useCallback(() => {
    if (!prompt.trim()) return;
    mutation.mutate({ prompt: prompt.trim() });
  }, [prompt, mutation]);

  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  }, []);

  const flatItems = useMemo<SuggestedTaskListItem[]>(() => {
    if (!result) return [];
    return result.milestones.flatMap((m) =>
      m.tasks.map((t) => ({
        title: t.title,
        priority: t.priority,
        badge: `${t.estimateHours}h`,
        group: m.name,
      })),
    );
  }, [result]);

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 flex flex-col gap-3 h-full">
      <div className="flex items-start gap-3">
        <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
          <ListChecks className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Plan from Prompt</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">Generate milestones and tasks from a goal</p>
        </div>
      </div>

      <div className="flex-1 space-y-2.5">
        <Textarea
          value={prompt}
          onChange={handlePromptChange}
          placeholder="e.g. Build a mobile checkout flow with payment integration by end of Q3"
          className="text-[13px] min-h-[72px] resize-none"
          disabled={mutation.isPending}
          aria-label="Describe what you want to plan"
        />

        {!mutation.isPending && (
          <Button
            size="sm"
            onClick={handleRun}
            disabled={!featureEnabled || !prompt.trim()}
            className="h-8 gap-1.5 text-xs"
          >
            {result ? <RotateCcw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {result
              ? "Regenerate"
              : featureEnabled
                ? "Generate Plan"
                : `Requires ${requiredPlan ?? "PROFESSIONAL"} plan`}
          </Button>
        )}

        {mutation.isPending && (
          <div className="space-y-1.5 py-1">
            <Skeleton className="h-3.5 w-3/4 rounded" />
            <Skeleton className="h-3.5 w-full rounded" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        )}

        {mutation.isError && (
          <p className="text-[13px] text-destructive leading-snug">
            {getErrorMessage(mutation.error)}
          </p>
        )}

        {result && (
          <div className="space-y-3 pt-1 border-t border-border/60">
            {result.summary && (
              <p className="text-[13px] text-muted-foreground leading-relaxed">{result.summary}</p>
            )}
            <SuggestedTaskList items={flatItems} projectId={projectId} />
          </div>
        )}
      </div>
    </div>
  );
}
