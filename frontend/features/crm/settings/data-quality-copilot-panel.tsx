"use client";

import { useCallback } from "react";
import { Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { useDataQualityCopilot } from "@/hooks/api/crm";
import { AiGeneratedLabel } from "@/components/ai";

type IssueKind = "missing_field" | "likely_duplicate" | "incomplete_stage" | "stale_data";
type Severity = "high" | "medium" | "low";

const ISSUE_KIND_LABELS: Record<IssueKind, string> = {
  missing_field: "Missing field",
  likely_duplicate: "Likely duplicate",
  incomplete_stage: "Incomplete stage",
  stale_data: "Stale data",
};

const SEVERITY_VARIANTS: Record<Severity, "destructive" | "default" | "secondary"> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
};

export function DataQualityCopilotPanel() {
  const mutation = useDataQualityCopilot();
  const result = mutation.data;

  const handleRun = useCallback(() => {
    mutation.mutate(undefined, {
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [mutation]);

  return (
    <div className="space-y-1.5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Data Quality Copilot
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI analysis of missing fields, likely duplicates, and stage completeness
              </p>
            </div>
            <LoadingButton
              size="sm"
              variant="outline"
              isPending={mutation.isPending}
              loadingText="Analyzing..."
              onClick={handleRun}
              className="h-7 text-xs shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Run AI Analysis
            </LoadingButton>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {mutation.isPending && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          )}

          {!mutation.isPending && result && (
            <>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-foreground leading-relaxed">{result.summary}</p>
                <AiGeneratedLabel className="shrink-0" />
              </div>

              {result.priorityAction && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 p-2.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-0.5">Priority Action</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">{result.priorityAction}</p>
                  </div>
                </div>
              )}

              {result.issues.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 py-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Your CRM data looks complete. No AI-detected issues found.
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {result.issues.length} issue{result.issues.length !== 1 ? "s" : ""} detected
                  </p>
                  {result.issues.map((issue, i) => (
                    <div key={i} className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-foreground">{issue.entityName}</p>
                        <div className="flex items-center gap-1">
                          <Badge className="text-[9px] h-4 px-1" variant="outline">
                            {ISSUE_KIND_LABELS[issue.issueKind as IssueKind] ?? issue.issueKind}
                          </Badge>
                          <Badge
                            className="text-[9px] h-4 px-1"
                            variant={SEVERITY_VARIANTS[issue.severity as Severity] ?? "secondary"}
                          >
                            {issue.severity}
                          </Badge>
                        </div>
                      </div>
                      {issue.field && (
                        <p className="text-[10px] text-muted-foreground">Field: <span className="font-medium">{issue.field}</span></p>
                      )}
                      <p className="text-[11px] text-foreground">{issue.suggestedFix}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!mutation.isPending && !result && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Run AI analysis to detect data quality issues across your CRM.
            </p>
          )}
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground px-1">
        AI suggestions are guidance only. Review before applying changes.
      </p>
    </div>
  );
}
