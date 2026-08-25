"use client";

import { useState, useCallback, useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { SparklesIcon } from "@animateicons/react/lucide";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { Plan } from "@/lib/billing/feature-gates";
import { usePlanFromPrompt } from "@/hooks/api/build/ai";
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
  const { iconRef, hoverHandlers } = useAnimatedIcon();

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
    <div className="flex flex-col gap-2.5">
      <Textarea
        value={prompt}
        onChange={handlePromptChange}
        placeholder="e.g. Build a mobile checkout flow with payment integration by end of Q3"
        className="min-h-[72px] resize-none text-label"
        disabled={mutation.isPending}
        aria-label="Describe what you want to plan"
      />

      {!mutation.isPending ? (
        <LoadingButton
          size="sm"
          onClick={handleRun}
          disabled={!featureEnabled || !prompt.trim()}
          isPending={mutation.isPending}
          className="w-full gap-1.5 text-xs"
          {...hoverHandlers}
        >
          {result ? (
            <RotateCcw className="h-3.5 w-3.5" />
          ) : (
            <SparklesIcon ref={iconRef} size={14} />
          )}
          {result
            ? "Regenerate"
            : featureEnabled
              ? "Generate Plan"
              : `Requires ${requiredPlan ?? "PROFESSIONAL"} plan`}
        </LoadingButton>
      ) : null}

      {mutation.isPending ? (
        <div className="space-y-1.5 py-1">
          <Skeleton className="h-3.5 w-3/4 rounded" />
          <Skeleton className="h-3.5 w-full rounded" />
          <Skeleton className="h-10 w-full rounded-lg" />         <Skeleton className="h-10 w-full rounded-lg" />         <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : null}

      {mutation.isError ? (
        <p className="text-label leading-snug text-destructive">
          {getErrorMessage(mutation.error)}
        </p>
      ) : null}

      {result ? (
        <div className="space-y-3 border-t border-border/60 pt-1">
          {result.summary ? (
            <p className="text-label leading-relaxed text-muted-foreground">{result.summary}</p>
          ) : null}
          <SuggestedTaskList items={flatItems} projectId={projectId} />
        </div>
      ) : null}
    </div>
  );
}
