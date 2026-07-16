"use client";

import { useState, useCallback } from "react";
import { RotateCcw, Check } from "lucide-react";
import { SparklesIcon } from "@animateicons/react/lucide";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { Plan } from "@/lib/billing/feature-gates";
import { useExtractMeetingActions } from "@/hooks/api/projects/meetings-ai";

interface MeetingActionsCardProps {
  projectId: number;
  meetingId: number;
  featureEnabled: boolean;
  requiredPlan: Plan | null;
}

interface ActionRowProps {
  index: number;
  title: string;
  ownerName: string;
  dueDateHint: string;
  rationale: string;
  selected: boolean;
  onToggle: (index: number) => void;
}

function ActionRow({ index, title, ownerName, dueDateHint, rationale, selected, onToggle }: ActionRowProps) {
  const handleClick = useCallback(() => {
    onToggle(index);
  }, [index, onToggle]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={[
        "w-full rounded-md border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-primary/20 bg-primary/10"
          : "border-transparent bg-muted/40 hover:bg-muted",
      ].join(" ")}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={[
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
            selected ? "border-primary bg-primary" : "border-border bg-background",
          ].join(" ")}
        >
          {selected ? <Check className="h-2.5 w-2.5 text-primary-foreground" /> : null}
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-[13px] font-medium text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">
            {ownerName}
            {dueDateHint ? ` · ${dueDateHint}` : ""}
          </p>
          {rationale ? (
            <p className="text-[11px] text-muted-foreground/70">{rationale}</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function MeetingActionsCard({
  projectId,
  meetingId,
  featureEnabled,
  requiredPlan,
}: MeetingActionsCardProps) {
  const mutation = useExtractMeetingActions(projectId, meetingId);
  const result = mutation.data;
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const handleRun = useCallback(() => {
    mutation.mutate(undefined, {
      onSuccess: (data) => {
        setSelected(new Set(data.actions.map((_, i) => i)));
      },
    });
  }, [mutation]);

  const handleToggle = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const isIdle = !result && !mutation.isPending && !mutation.isError;

  return (
    <div className="flex flex-col gap-3">
      {isIdle ? (
        <LoadingButton
          size="sm"
          onClick={handleRun}
          disabled={!featureEnabled}
          isPending={mutation.isPending}
          className="w-full gap-1.5 text-xs"
          {...hoverHandlers}
        >
          <SparklesIcon ref={iconRef} size={14} />
          {featureEnabled
            ? "Extract Action Items"
            : `Requires ${requiredPlan ?? "PROFESSIONAL"} plan`}
        </LoadingButton>
      ) : null}

      {mutation.isPending ? (
        <div className="space-y-2 py-1">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      ) : null}

      {mutation.isError ? (
        <div className="space-y-2.5">
          <p className="text-[13px] leading-snug text-destructive">{getErrorMessage(mutation.error)}</p>
          <LoadingButton variant="outline" size="sm" onClick={handleRun} className="w-full gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </LoadingButton>
        </div>
      ) : null}

      {result ? (
        <div className="space-y-2.5">
          {result.summary ? (
            <p className="text-[12px] text-muted-foreground">{result.summary}</p>
          ) : null}

          {result.actions.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No action items found in this meeting.</p>
          ) : (
            <ul className="space-y-2">
              {result.actions.map((action, i) => (
                <li key={i}>
                  <ActionRow
                    index={i}
                    title={action.title}
                    ownerName={action.ownerName}
                    dueDateHint={action.dueDateHint}
                    rationale={action.rationale}
                    selected={selected.has(i)}
                    onToggle={handleToggle}
                  />
                </li>
              ))}
            </ul>
          )}

          <p className="text-[11px] text-muted-foreground">
            Suggestions only — select and create via the meetings action items tab.
          </p>

          <LoadingButton
            variant="ghost"
            size="sm"
            onClick={handleRun}
            isPending={mutation.isPending}
            className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            Re-extract
          </LoadingButton>
        </div>
      ) : null}
    </div>
  );
}
