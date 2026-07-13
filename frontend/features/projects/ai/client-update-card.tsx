"use client";

import { useState, useCallback } from "react";
import { Users, RotateCcw, Sparkles, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
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
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }, [result]);

  const isIdle = !result && !mutation.isPending && !mutation.isError;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 flex flex-col gap-3 h-full">
      <div className="flex items-start gap-3">
        <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/30">
          <Users className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Draft Client Update</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">Client-safe — internal data excluded</p>
        </div>
      </div>

      <div className="flex-1">
        {isIdle && (
          <Button
            size="sm"
            onClick={handleRun}
            disabled={!featureEnabled}
            className="h-8 gap-1.5 text-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {featureEnabled ? "Draft Update" : `Requires ${requiredPlan ?? "PROFESSIONAL"} plan`}
          </Button>
        )}

        {mutation.isPending && (
          <div className="space-y-2 py-1">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3.5 w-full rounded" />
            <Skeleton className="h-3.5 w-5/6 rounded" />
            <Skeleton className="h-3.5 w-4/5 rounded" />
          </div>
        )}

        {mutation.isError && (
          <div className="space-y-2.5">
            <p className="text-[13px] text-destructive leading-snug">
              {getErrorMessage(mutation.error)}
            </p>
            <Button variant="outline" size="sm" onClick={handleRun} className="h-8 gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <p className="text-[13px] font-semibold text-foreground">{result.headline}</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">{result.body}</p>
            {result.sections.length > 0 && (
              <div className="space-y-2.5">
                {result.sections.map((section, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-[12px] font-semibold text-foreground/80">{section.heading}</p>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{section.content}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRun}
                disabled={mutation.isPending}
                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground -ml-2"
              >
                <RotateCcw className="h-3 w-3" />
                Regenerate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
