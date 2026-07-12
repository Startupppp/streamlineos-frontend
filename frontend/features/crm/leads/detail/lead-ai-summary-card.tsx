"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { useLeadSummary } from "@/hooks/api/crm";
import { useOrgFeatureFlags } from "@/hooks/api/ai";

interface LeadSummaryResult {
  summary: string;
  nextBestActions: string[];
  generatedAt: string;
}

interface LeadAiSummaryCardProps {
  leadId: number;
  leadName?: string | null;
}

export function LeadAiSummaryCard({ leadId, leadName }: LeadAiSummaryCardProps) {
  const [result, setResult] = useState<LeadSummaryResult | null>(null);

  const { data: flags } = useOrgFeatureFlags();
  const { mutate: generate, isPending } = useLeadSummary();

  const handleGenerate = useCallback(() => {
    generate(leadId, {
      onSuccess: (data) => setResult(data),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [generate, leadId]);

  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-blue-600" />
          AI Lead Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {flags?.aiLeadScoring === false && (
          <div className="py-2 text-center text-xs text-muted-foreground bg-muted/50 rounded-lg px-3">
            AI lead scoring is disabled for your organization. Enable it in{" "}
            <Link href="/crm/settings/ai" className="text-blue-600 hover:underline">
              AI Settings
            </Link>
            .
          </div>
        )}

        {flags?.aiLeadScoring !== false && isPending && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        )}

        {flags?.aiLeadScoring !== false && !isPending && result && (
          <div className="space-y-3">
            <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
            {result.nextBestActions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Next Best Actions
                </p>
                <ul className="space-y-1.5">
                  {result.nextBestActions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                      <span className="text-xs text-foreground">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <Badge variant="secondary" className="text-[10px]">
                AI generated
              </Badge>
              <LoadingButton
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-blue-600 hover:text-blue-700"
                isPending={isPending}
                onClick={handleGenerate}
              >
                Regenerate
              </LoadingButton>
            </div>
          </div>
        )}

        {flags?.aiLeadScoring !== false && !isPending && !result && (
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-xs text-muted-foreground text-center">
              Generate an AI summary and next best actions for{" "}
              {leadName ? <span className="font-medium">{leadName}</span> : "this lead"}.
            </p>
            <LoadingButton
              size="sm"
              isPending={isPending}
              loadingText="Generating..."
              onClick={handleGenerate}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate AI Summary
            </LoadingButton>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
