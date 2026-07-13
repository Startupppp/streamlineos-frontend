"use client";

import { useState, useCallback, useMemo } from "react";
import { FileText, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
    if (!text.trim()) return;
    mutation.mutate({ text: text.trim() });
  }, [text, mutation]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  }, []);

  const items = useMemo<SuggestedTaskListItem[]>(() => {
    if (!result) return [];
    return result.tasks.map((t) => {
      const parts: string[] = [];
      if (t.suggestedAssignee) parts.push(`@${t.suggestedAssignee}`);
      if (t.dueHint) parts.push(t.dueHint);
      return {
        title: t.title,
        priority: t.priority,
        badge: parts.length > 0 ? parts.join(" · ") : undefined,
      };
    });
  }, [result]);

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-muted border border-border">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Extract Tasks from Notes</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">Paste meeting notes or chat to extract action items</p>
        </div>
      </div>

      <div className="space-y-2.5">
        <Textarea
          value={text}
          onChange={handleTextChange}
          placeholder="Paste meeting notes, Slack thread, or any unstructured text…"
          className="text-[13px] min-h-[80px] resize-none"
          disabled={mutation.isPending}
          aria-label="Text to extract tasks from"
        />

        {!mutation.isPending && (
          <Button
            size="sm"
            onClick={handleRun}
            disabled={!featureEnabled || !text.trim()}
            className="h-8 gap-1.5 text-xs"
          >
            {result ? <RotateCcw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {result
              ? "Re-extract"
              : featureEnabled
                ? "Extract Tasks"
                : `Requires ${requiredPlan ?? "PROFESSIONAL"} plan`}
          </Button>
        )}

        {mutation.isPending && (
          <div className="space-y-1.5 py-1">
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
          <div className="pt-1 border-t border-border/60">
            {result.tasks.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No actionable tasks found in the text.</p>
            ) : (
              <SuggestedTaskList items={items} projectId={projectId} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
