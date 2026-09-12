"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, Eye, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { CrmOptionSelect } from "@/features/crm/shared/metadata/crm-option-select";
import { usePreviewAssignmentRule } from "@/hooks/api/crm-settings";
import { getErrorMessage } from "@/lib/get-error-message";

/**
 * What the rules would do with a lead that looked like this.
 *
 * Deliberately not a record surface and deliberately not generated: it edits
 * nothing and lists nothing, it composes a hypothetical and shows the trace the
 * server returns. The panel is named in the crafted-surface allowlist for
 * exactly that reason — a rule tester is an explanation, not a record.
 */
export function AssignmentRulePreviewPanel() {
  const [source, setSource] = useState("");
  const [priority, setPriority] = useState("");
  const [score, setScore] = useState("");
  const [city, setCity] = useState("");
  const previewRule = usePreviewAssignmentRule();

  const handleRunPreview = useCallback(() => {
    previewRule.mutate(
      {
        source: source || undefined,
        priority: priority || undefined,
        score: score ? Number(score) : undefined,
        city: city || undefined,
      },
      { onError: (error) => toast.error(getErrorMessage(error)) },
    );
  }, [previewRule, source, priority, score, city]);

  const handleScoreChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setScore(event.target.value),
    [],
  );
  const handleCityChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setCity(event.target.value),
    [],
  );

  return (
    <Card className="shrink-0">
      <CardHeader className="border-b border-border px-4 py-3">
        <CardTitle className="flex items-center gap-gap-field text-sm font-semibold">
          <Eye className="h-4 w-4 text-primary" />
          Assignment preview
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-gap-toolbar px-4 py-4">
        <div className="grid grid-cols-1 gap-gap-toolbar sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-gap-inline">
            <Label htmlFor="preview-source">Lead source</Label>
            <CrmOptionSelect
              id="preview-source"
              type="source"
              value={source}
              onChange={setSource}
              placeholder="Select source…"
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-gap-inline">
            <Label htmlFor="preview-priority">Lead priority</Label>
            <CrmOptionSelect
              id="preview-priority"
              type="priority"
              value={priority}
              onChange={setPriority}
              placeholder="Select priority…"
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-gap-inline">
            <Label htmlFor="preview-score">Lead score</Label>
            <Input
              id="preview-score"
              type="number"
              value={score}
              onChange={handleScoreChange}
              placeholder="85"
            />
          </div>
          <div className="flex flex-col gap-gap-inline">
            <Label htmlFor="preview-city">City</Label>
            <Input id="preview-city" value={city} onChange={handleCityChange} placeholder="Mumbai" />
          </div>
        </div>

        <div>
          <LoadingButton
            type="button"
            size="sm"
            onClick={handleRunPreview}
            isPending={previewRule.isPending}
            loadingText="Running…"
          >
            Preview assignment
          </LoadingButton>
        </div>

        {previewRule.data ? (
          <div className="flex flex-col gap-gap-field rounded-lg border border-border bg-muted/40 p-card-pad text-dense">
            <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
              Trace
            </p>
            {previewRule.data.trace.map((step) => (
              <div key={step.ruleId} className="flex items-start gap-gap-field">
                {step.matched ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-success-ink" />
                ) : (
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <span className="font-medium">{step.ruleName}</span>
                  <span className="ml-1 text-muted-foreground">— {step.reason}</span>
                </div>
              </div>
            ))}
            <div className="border-t border-border pt-1">
              {previewRule.data.wouldAssignTo ? (
                <span className="font-medium text-status-success-ink">
                  Assign to: {previewRule.data.wouldAssignTo}
                </span>
              ) : (
                <span className="text-muted-foreground">No rule matched</span>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
