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
import { useExtractTasks } from "@/hooks/api/projects/ai";
import { SuggestedTaskList } from "./suggested-task-list";
import type { SuggestedTaskListItem } from "./suggested-task-list";

interface ExtractTasksCardProps {
  projectId: number;
  featureEnabled: boolean;
  requiredPlan: Plan | null;
}

export function ExtractTasksCard({
  projectId,
  featureEnabled,
  requiredPlan,
}: ExtractTasksCardProps) {
  const [text, setText] = useState("");
  const mutation = useExtractTasks(projectId);
  const result = mutation.data;
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const handleRun = useCallback(() => {
    if (!text.trim()) return;
    mutation.mutate({ text: text.trim() });
  }, [text, mutation]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
    },
    [],
  );

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
    <div className="flex flex-col gap-2.5">
      <Textarea
        value={text}
        onChange={handleTextChange}
        placeholder="Paste meeting notes, a chat thread, or any unstructured text…"
        className="min-h-[80px] resize-none text-[13px]"
        disabled={mutation.isPending}
        aria-label="Text to extract tasks from"
      />

      {!mutation.isPending ? (
        <LoadingButton
          size="sm"
          onClick={handleRun}
          disabled={!featureEnabled || !text.trim()}
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
            ? "Re-extract"
            : featureEnabled
              ? "Extract Tasks"
              : `Requires ${requiredPlan ?? "PROFESSIONAL"} plan`}
        </LoadingButton>
      ) : null}

      {mutation.isPending ? (
        <div className="space-y-1.5 py-1">
          <Skeleton className="h-10 w-full rounded-lg" />{" "}
          <Skeleton className="h-10 w-full rounded-lg" />{" "}
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : null}

      {mutation.isError ? (
        <p className="text-[13px] leading-snug text-destructive">
          {getErrorMessage(mutation.error)}
        </p>
      ) : null}

      {result ? (
        <div className="border-t border-border/60 pt-1">
          {result.tasks.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              No actionable tasks found in the text.
            </p>
          ) : (
            <SuggestedTaskList items={items} projectId={projectId} />
          )}
        </div>
      ) : null}
    </div>
  );
}
