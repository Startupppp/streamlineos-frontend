"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { SparklesIcon, CopyIcon, CheckIcon } from "@animateicons/react/lucide";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { Plan } from "@/lib/billing/feature-gates";
import { useDraftClientUpdate } from "@/hooks/api/projects/ai";

interface ClientUpdateCardProps {
  projectId: number;
  featureEnabled: boolean;
  requiredPlan: Plan | null;
}

export function ClientUpdateCard({ projectId, featureEnabled, requiredPlan }: ClientUpdateCardProps) {
  const mutation = useDraftClientUpdate(projectId);
  const result = mutation.data;
  const [copied, setCopied] = useState(false);
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const { iconRef: copyIconRef, hoverHandlers: copyHoverHandlers } = useAnimatedIcon();
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleRun = useCallback(() => {
    mutation.mutate(undefined);
  }, [mutation]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    const text = [
      result.headline,
      "",
      result.body,
      ...result.sections.flatMap((s) => [`\n${s.heading}`, s.content]),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        copyTimerRef.current = null;
        setCopied(false);
      }, 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }, [result]);

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
          {featureEnabled ? "Draft Update" : `Requires ${requiredPlan ?? "PROFESSIONAL"} plan`}
        </LoadingButton>
      ) : null}

      {mutation.isPending ? (
        <div className="space-y-2 py-1">
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-3.5 w-full rounded" />
          <Skeleton className="h-3.5 w-5/6 rounded" />
          <Skeleton className="h-3.5 w-4/5 rounded" />
        </div>
      ) : null}

      {mutation.isError ? (
        <div className="space-y-2.5">
          <p className="text-[13px] leading-snug text-destructive">
            {getErrorMessage(mutation.error)}
          </p>
          <LoadingButton
            variant="outline"
            size="sm"
            onClick={handleRun}
            className="w-full gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </LoadingButton>
        </div>
      ) : null}

      {result ? (
        <div className="space-y-3">
          <p className="text-[13px] font-semibold text-foreground">{result.headline}</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">{result.body}</p>
          {result.sections.length > 0 ? (
            <div className="space-y-2.5">
              {result.sections.map((section, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-[12px] font-semibold text-foreground/80">{section.heading}</p>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">{section.content}</p>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex w-full flex-col gap-2 pt-1">
            <LoadingButton
              variant="ghost"
              size="sm"
              onClick={handleRun}
              isPending={mutation.isPending}
              className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Regenerate
            </LoadingButton>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="w-full gap-1.5 text-xs"
              {...copyHoverHandlers}
            >
              {copied ? (
                <CheckIcon ref={copyIconRef} size={14} className="text-emerald-500" />
              ) : (
                <CopyIcon ref={copyIconRef} size={14} />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
