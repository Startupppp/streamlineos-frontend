"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useEffectiveRules } from "@/hooks/api/hr/settings-hub";
import type { EffectiveRuleItem } from "@/hooks/api/hr/settings-hub";
import { POLICY_TYPE_LABELS } from "@/types/hr/policies";
import type { HrPolicyType } from "@/types/hr/policies";

function isPolicyType(t: string): t is HrPolicyType {
  return t in POLICY_TYPE_LABELS;
}

function getTypeLabel(policyType: string): string {
  return isPolicyType(policyType) ? POLICY_TYPE_LABELS[policyType] : policyType;
}

function RuleCard({ item }: { item: EffectiveRuleItem }) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4">
      <div className="flex items-start gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {getTypeLabel(item.policyType)}
          </p>
          <p className="text-sm font-medium text-foreground mt-0.5 truncate">
            {item.matchedPolicy.name}
          </p>
        </div>
        <span className="text-xs font-mono text-muted-foreground shrink-0">
          v{item.matchedPolicy.version}
        </span>
        <Badge
          variant="outline"
          className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
        >
          {item.matchedPolicy.status}
        </Badge>
      </div>

      <div className="mb-3">
        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Why this rule?</p>
        <div className="flex flex-col gap-1">
          {item.trace.matchedScopes.map((scope, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-foreground font-medium">{scope.scopeType}</span>
              <span className="text-muted-foreground">=</span>
              <span className="text-foreground font-mono">{scope.scopeValue}</span>
              <span className="text-muted-foreground ml-auto">specificity {scope.specificity}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Priority: {item.trace.priority} · Max specificity: {item.trace.maxSpecificity}
        </p>
      </div>

      <details className="group">
        <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer select-none list-none flex items-center gap-1">
          <span className="group-open:hidden">▶ Show rules</span>
          <span className="hidden group-open:inline">▼ Hide rules</span>
        </summary>
        <pre className="text-xs font-mono bg-muted/50 rounded-lg p-3 mt-2 overflow-auto max-h-48 whitespace-pre-wrap">
          {JSON.stringify(item.rules, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export function EffectiveRulesPreview() {
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const params =
    employeeId.trim() && date ? { employeeId: employeeId.trim(), date } : null;

  const { data, isLoading } = useEffectiveRules(params);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Employee ID"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="h-8 text-xs w-56"
        />
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-8 text-xs w-40"
        />
        <span className="text-xs text-muted-foreground">
          {params ? "Showing effective rules" : "Enter an employee ID to preview"}
        </span>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="flex flex-col gap-3">
          {data.map((item) => (
            <RuleCard key={item.policyType} item={item} />
          ))}
        </div>
      ) : params ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-foreground mb-1">No rules matched</p>
          <p className="text-xs text-muted-foreground">
            No rules match this employee on the selected date.
          </p>
        </div>
      ) : null}
    </div>
  );
}
