"use client";

import { useState, useCallback, useMemo } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
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
    if (!featureEnabled) {
      toast.error(`AI Project Manager requires the ${requiredPlan ?? "PROFESSIONAL"} plan.`);
      return;
    }
    if (!prompt.trim()) {
      toast.error("Please enter a prompt describing what you want to plan.");
      return;
    }
    mutation.mutate(
      { prompt: prompt.trim() },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  }, [featureEnabled, requiredPlan, prompt, mutation]);

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
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-foreground">Plan from Prompt</h3>
        <p className="text-[12px] text-muted-foreground mt-0.5">Generate milestones and tasks from a goal</p>
      </div>

      <div className="space-y-2">
        <Textarea
          value={prompt}
          onChange={handlePromptChange}
          placeholder="e.g. Build a mobile checkout flow with payment integration by end of Q3"
          className="text-[13px] min-h-[72px] resize-none"
          disabled={mutation.isPending}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleRun}
          disabled={mutation.isPending || !featureEnabled || !prompt.trim()}
          className="h-8 gap-1.5 text-xs"
        >
          {mutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          )}
          {mutation.isPending ? "Planning…" : "Generate Plan"}
        </Button>
      </div>

      {result && (
        <div className="space-y-3 pt-3 border-t border-border/60">
          {result.summary && (
            <p className="text-[13px] text-muted-foreground leading-relaxed">{result.summary}</p>
          )}
          <SuggestedTaskList items={flatItems} projectId={projectId} />
        </div>
      )}
    </div>
  );
}
