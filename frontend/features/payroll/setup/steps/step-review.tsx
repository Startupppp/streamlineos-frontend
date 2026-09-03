"use client";

import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { NavButtons } from "@/features/payroll/setup/nav-buttons";
import { usePreviewPolicy } from "@/hooks/api/payroll";
import { describeComponentBasis } from "@/features/payroll/shared";
import type { SetupDraft } from "@/features/payroll/setup/lib/draft";
import type { ComponentType, PolicyPreviewComponent } from "@/types/payroll/setup";

function toOverridesRecord(
  overrides: Partial<Record<string, boolean>> | undefined,
): Record<string, boolean> | undefined {
  if (!overrides) return undefined;
  return Object.fromEntries(
    Object.entries(overrides).filter((e): e is [string, boolean] => e[1] !== undefined),
  );
}

const TYPE_LABELS: Record<ComponentType, string> = {
  EARNING: "Earnings",
  DEDUCTION: "Deductions",
  EMPLOYER_CONTRIBUTION: "Employer Contributions",
  REIMBURSEMENT: "Reimbursements",
  TAX: "Tax",
  ADJUSTMENT: "Adjustments",
};

const TYPE_ORDER: ComponentType[] = [
  "EARNING",
  "EMPLOYER_CONTRIBUTION",
  "TAX",
  "DEDUCTION",
  "REIMBURSEMENT",
  "ADJUSTMENT",
];

function groupComponents(
  lines: PolicyPreviewComponent[],
): [ComponentType, PolicyPreviewComponent[]][] {
  const map = new Map<ComponentType, PolicyPreviewComponent[]>();
  for (const line of lines) {
    const existing = map.get(line.type) ?? [];
    map.set(line.type, [...existing, line]);
  }
  return TYPE_ORDER.filter((t) => map.has(t)).map((t) => [t, map.get(t)!]);
}

type StepReviewProps = {
  draft: SetupDraft;
  goNext: () => void;
  goBack: () => void;
};

export function StepReview({ draft, goNext, goBack }: StepReviewProps) {
  const preview = usePreviewPolicy();
  const { mutate: previewMutate } = preview;
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    previewMutate({
      templateKey: draft.templateKey ?? undefined,
      toggleOverrides: toOverridesRecord(draft.toggleOverrides),
      country: draft.profile?.country,
      payDay: draft.profile?.payDay,
      startMonth: draft.profile?.startMonth,
    });
  }, [draft.profile?.country, draft.profile?.payDay, draft.profile?.startMonth, draft.templateKey, draft.toggleOverrides, previewMutate]);

  function handleRetry() {
    calledRef.current = false;
    previewMutate({
      templateKey: draft.templateKey ?? undefined,
      toggleOverrides: toOverridesRecord(draft.toggleOverrides),
      country: draft.profile?.country,
      payDay: draft.profile?.payDay,
      startMonth: draft.profile?.startMonth,
    });
  }

  if (preview.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <NavButtons onBack={goBack} isLoading />
      </div>
    );
  }

  if (preview.isError || !preview.data) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
          <p className="text-sm text-muted-foreground">Failed to generate policy preview</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </div>
        <NavButtons onBack={goBack} />
      </div>
    );
  }

  const { components, approvalChain, essOptions, statutoryPack, calendarPlan } = preview.data;
  const grouped = groupComponents(components);
  const currency = draft.profile?.currency ?? "INR";
  const enabledEssOptions = Object.entries(essOptions).filter(([, v]) => !!v).map(([k]) => k);

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="bg-muted rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Salary Components
          </p>
          {grouped.map(([type, lines]) => (
            <div key={type}>
              <p className="text-xs font-medium text-foreground mb-1.5">{TYPE_LABELS[type]}</p>
              <div className="space-y-1">
                {lines.map((line) => (
                  <div key={line.code} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-foreground">{line.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {describeComponentBasis(line, currency)}
                    </span>
                  </div>
                ))}
              </div>
              <Separator className="mt-3" />
            </div>
          ))}
        </div>

        {approvalChain.length > 0 && (
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Approval Chain
            </p>
            <ol className="space-y-1.5">
              {approvalChain.map((stage) => (
                <li key={stage.stage} className="flex items-center gap-2 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-micro font-bold">
                    {stage.stage}
                  </span>
                  <span className="text-foreground">{stage.stageName}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {stage.requiredPermission}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {enabledEssOptions.length > 0 && (
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Employee Self-Service
            </p>
            <ul className="space-y-1">
              {enabledEssOptions.map((opt) => (
                <li key={opt} className="flex items-center gap-2 text-sm text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-success-fill shrink-0" />
                  {opt}
                </li>
              ))}
            </ul>
          </div>
        )}

        {calendarPlan && calendarPlan.length > 0 && (
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Payroll Calendar
            </p>
            <div className="space-y-1.5">
              {calendarPlan.map((event) => (
                <div key={event.type} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{event.title}</span>
                  <span className="font-mono text-foreground">{event.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {statutoryPack && draft.profile?.country !== "IN" && (
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {statutoryPack.countryName} Statutory Pack
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-foreground">
                {statutoryPack.items.filter((i) => i.enabled).length} statutory items active
              </span>
              {statutoryPack.complianceChecklist.length > 0 && (
                <span className="text-muted-foreground">
                  {statutoryPack.complianceChecklist.length} compliance checks
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <NavButtons
        onBack={goBack}
        onNext={goNext}
        nextLabel="Looks good, activate"
      />
    </div>
  );
}
