"use client";

import { useCallback } from "react";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
    if (!featureEnabled) {
      toast.error(`AI Project Manager requires the ${requiredPlan ?? "PROFESSIONAL"} plan.`);
      return;
    }
    mutation.mutate(undefined, {
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [featureEnabled, requiredPlan, mutation]);

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

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Draft Client Update</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Client-safe — internal data excluded
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {result && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 gap-1.5 text-xs text-muted-foreground"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRun}
            disabled={mutation.isPending || !featureEnabled}
            className="h-8 gap-1.5 text-xs"
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            )}
            {mutation.isPending ? "Drafting…" : "Draft Update"}
          </Button>
        </div>
      </div>

      {result && (
        <div className="space-y-3 pt-3 border-t border-border/60">
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
        </div>
      )}
    </div>
  );
}
