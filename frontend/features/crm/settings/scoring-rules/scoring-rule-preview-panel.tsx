"use client";

import { useMemo } from "react";
import { Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusToneClasses } from "@/lib/design-tokens";
import type { ScoringRule } from "@/hooks/api/crm-settings";

/**
 * What these rules would score a typical lead.
 *
 * Not a record surface — the lead is invented and never saved — but the most
 * useful thing on the page, because a scoring rule is otherwise a number with no
 * sense of scale. Scoring is done here rather than asked of the server because
 * there is no endpoint for it; if one appears, this becomes a mutation and the
 * arithmetic goes away.
 */

const SAMPLE_LEAD: ReadonlyArray<{ field: string; label: string; value: string }> = [
  { field: "source", label: "Source", value: "referral" },
  { field: "priority", label: "Priority", value: "HOT" },
  { field: "status", label: "Status", value: "INTERESTED" },
  { field: "company", label: "Company", value: "TechCorp India" },
  { field: "city", label: "City", value: "Mumbai" },
  { field: "potentialValue", label: "Potential value", value: "5000000" },
  { field: "investmentInterest", label: "Investment interest", value: "3000000" },
];

function matches(rule: ScoringRule, actual: string): boolean {
  switch (rule.operator) {
    case "eq":
      return actual === rule.value;
    case "gt":
      return Number(actual) > Number(rule.value);
    case "lt":
      return Number(actual) < Number(rule.value);
    case "contains":
      return actual.toLowerCase().includes(rule.value.toLowerCase());
    case "in":
      return rule.value.split(",").map((entry) => entry.trim()).includes(actual);
    default:
      return false;
  }
}

export function ScoringRulePreviewPanel({ rules }: { rules: readonly ScoringRule[] }) {
  const score = useMemo(() => {
    const values = new Map(SAMPLE_LEAD.map((entry) => [entry.field, entry.value]));
    return rules.reduce(
      (total, rule) => (matches(rule, values.get(rule.field) ?? "") ? total + rule.points : total),
      0,
    );
  }, [rules]);

  const tone = statusToneClasses(score <= 30 ? "danger" : score <= 60 ? "warning" : "success");

  return (
    <Card className="shrink-0">
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Zap className="h-4 w-4 text-primary" />
          What these rules would score a typical lead
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-gap-toolbar px-4 pb-4">
        <dl className="grid grid-cols-2 gap-gap-field md:grid-cols-4">
          {SAMPLE_LEAD.map((entry) => (
            <div key={entry.field} className="flex min-w-0 flex-col gap-gap-inline">
              <dt className="text-micro text-muted-foreground">{entry.label}</dt>
              <dd className="truncate text-dense font-medium">{entry.value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-card-pad">
          <span className="text-sm font-medium">Score</span>
          <span
            className={`rounded-md border px-3 py-1 font-mono text-base font-semibold tabular-nums ${tone.surface} ${tone.inkStrong} ${tone.rule}`}
          >
            {score}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
