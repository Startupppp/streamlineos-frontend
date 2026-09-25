"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { getTodayString } from "@/lib/date-utils";
import { UserCombobox } from "@/components/ui/user-combobox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useEffectiveRules } from "@/hooks/api/hr/settings-hub";
import type { EffectiveRuleItem } from "@/hooks/api/hr/settings-hub";
import { POLICY_TYPE_LABELS } from "@/types/hr/policies";
import type { HrPolicyType } from "@/types/hr/policies";
import { TruncatedText } from "@/components/ui/truncated-text";

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
          <TruncatedText text={item.matchedPolicy.name} className="text-sm font-medium text-foreground mt-0.5" />
        </div>
        <span className="text-xs font-mono text-muted-foreground shrink-0">
          v{item.matchedPolicy.version}
        </span>
        <Badge
          variant="outline"
          className="text-xs px-2 py-0.5 bg-status-success-surface text-status-success-ink border-status-success-rule shrink-0"
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
        <summary className="text-xs text-status-info-ink cursor-pointer select-none list-none flex w-fit items-center gap-1 rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none group-open:rotate-90" />
          <span className="group-open:hidden">Show rules</span>
          <span className="hidden group-open:inline">Hide rules</span>
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
  // Local calendar date: toISOString() is UTC and reads as yesterday/tomorrow near midnight.
  const [date, setDate] = useState(getTodayString);

  const params =
    employeeId.trim() && date ? { employeeId: employeeId.trim(), date } : null;

  const { data, isLoading, isError, error, refetch } = useEffectiveRules(params);

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDate(e.target.value);
  }

  function handleRetry() {
    void refetch();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-56">
          <UserCombobox
            value={employeeId}
            onChange={setEmployeeId}
            placeholder="Select employee"
          />
        </div>
        <Input
          type="date"
          value={date}
          onChange={handleDateChange}
          aria-label="Effective date"
          className="w-40"
        />
        <span className="text-xs text-muted-foreground">
          {params ? "Showing effective rules" : "Select an employee to preview"}
        </span>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Couldn't load effective rules"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : data && data.length > 0 ? (
        <div className="flex flex-col gap-3">
          {data.map((item) => (
            <RuleCard key={item.policyType} item={item} />
          ))}
        </div>
      ) : params ? (
        <EmptyState
          illustrationPreset="settings"
          title="No rules matched"
          description="No policy rules match this employee on the selected date."
        />
      ) : (
        <EmptyState
          illustrationPreset="person"
          title="No employee selected"
          description="Pick an employee and a date to preview the policy rules that apply to them."
        />
      )}
    </div>
  );
}
