"use client";

import { useState, useCallback, useMemo } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Plan } from "@/lib/billing/feature-gates";
import { useExtractTasks } from "@/hooks/api/projects/ai";
import { SuggestedTaskList } from "./suggested-task-list";
import type { SuggestedTaskListItem } from "./suggested-task-list";

interface ExtractTasksCardProps {
  projectId: number;
  featureEnabled: boolean;
  requiredPlan: Plan | null;
}

export function ExtractTasksCard({ projectId, featureEnabled, requiredPlan }: ExtractTasksCardProps) {
  const [text, setText] = useState("");
  const mutation = useExtractTasks(projectId);
  const result = mutation.data;

  const handleRun = useCallback(() => {
    if (!featureEnabled) {
      toast.error(`AI Project Manager requires the ${requiredPlan ?? "PROFESSIONAL"} plan.`);
      return;
    }
    if (!text.trim()) {
      toast.error("Paste some meeting notes or chat to extract tasks from.");
      return;
    }
    mutation.mutate(
      { text: text.trim() },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  }, [featureEnabled, requiredPlan, text, mutation]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  }, []);

  const items = useMemo<SuggestedTaskListItem[]>(() => {
    if (!result) return [];
    return result.tasks.map((t) => {
      const badgeParts: string[] = [];
      if (t.suggestedAssignee) badgeParts.push(`@${t.suggestedAssignee}`);
      if (t.dueHint) badgeParts.push(t.dueHint);
      return {
        title: t.title,
        priority: t.priority,
        badge: badgeParts.join(" · ") || undefined,
      };
    });
  }, [result]);

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-foreground">Extract Tasks from Notes</h3>
        <p className="text-[12px] text-muted-foreground mt-0.5">Paste meeting notes or chat to extract action items</p>
      </div>

      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={handleTextChange}
          placeholder="Paste meeting notes, Slack thread, or any unstructured text…"
          className="text-[13px] min-h-[80px] resize-none"
          disabled={mutation.isPending}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleRun}
          disabled={mutation.isPending || !featureEnabled || !text.trim()}
          className="h-8 gap-1.5 text-xs"
        >
          {mutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          )}
          {mutation.isPending ? "Extracting…" : "Extract Tasks"}
        </Button>
      </div>

      {result && (
        <div className="pt-3 border-t border-border/60">
          {result.tasks.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No actionable tasks found in the text.</p>
          ) : (
            <SuggestedTaskList items={items} projectId={projectId} />
          )}
        </div>
      )}
    </div>
  );
}
