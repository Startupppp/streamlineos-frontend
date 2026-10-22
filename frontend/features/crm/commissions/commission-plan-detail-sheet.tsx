"use client";

import { useCallback, useMemo, useState } from "react";
import { AppSheet } from "@/components/shared/app-sheet";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { useCommissionPlan } from "@/hooks/api/crm/commission";
import type { CommissionPlanVersion } from "@/hooks/api/crm/commission-schema";
import { useMemberDirectory } from "@/hooks/api/members/use-member-directory";
import { getUserDisplayName } from "@/lib/person-display";
import { formatMinor } from "@/lib/pricing-format";
import {
  AssignCommissionPlanDialog,
  EditCommissionPlanDialog,
  EndCommissionAssignmentDialog,
} from "./commission-plan-dialogs";
import type { CommissionPlanSheetTarget } from "./commission-plan-sheet";
import { formatBps, formatPeriodRange } from "./commission-format";

interface CommissionPlanDetailSheetProps {
  planId: string | null;
  locale: string;
  onOpenChange: (open: boolean) => void;
  onEditVersion: (target: CommissionPlanSheetTarget) => void;
}

type Dialog =
  | { kind: "edit" }
  | { kind: "assign" }
  | { kind: "end"; assignmentId: string; personName: string }
  | null;

function formatDay(iso: string, locale: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function CommissionPlanDetailSheet({
  planId,
  locale,
  onOpenChange,
  onEditVersion,
}: CommissionPlanDetailSheetProps) {
  const detail = useCommissionPlan(planId);
  const canManage = useCan("crm:commission-plans:manage");
  const [dialog, setDialog] = useState<Dialog>(null);
  const plan = detail.data?.plan;
  const versions = useMemo(
    () => [...(detail.data?.versions ?? [])].sort((a, b) => b.versionNumber - a.versionNumber),
    [detail.data?.versions],
  );
  const assignments = useMemo(() => detail.data?.assignments ?? [], [detail.data?.assignments]);
  const userIds = useMemo(() => assignments.map((row) => row.userId), [assignments]);
  const { selectedMembers } = useMemberDirectory({ kind: "org" }, { selectedIds: userIds, enabled: userIds.length > 0 });
  const nameOf = useCallback(
    (userId: string) => {
      const member = selectedMembers.find((candidate) => candidate.id === userId);
      return member ? getUserDisplayName(member) : "A former member";
    },
    [selectedMembers],
  );

  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setDialog(null);
  }, []);
  const handleEditPlan = useCallback(() => setDialog({ kind: "edit" }), []);
  const handleAssign = useCallback(() => setDialog({ kind: "assign" }), []);
  const handleEnd = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const row = assignments.find((entry) => entry.assignmentId === event.currentTarget.dataset.assignmentId);
      if (row) setDialog({ kind: "end", assignmentId: row.assignmentId, personName: nameOf(row.userId) });
    },
    [assignments, nameOf],
  );
  const openVersion = useCallback(
    (version: CommissionPlanVersion | null) => {
      if (plan) onEditVersion({ kind: "version", planId: plan.planId, currency: plan.currency, version });
    },
    [onEditVersion, plan],
  );
  const handleNewVersion = useCallback(() => openVersion(null), [openVersion]);
  const handleEditVersion = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) =>
      openVersion(versions.find((row) => row.planVersionId === event.currentTarget.dataset.versionId) ?? null),
    [openVersion, versions],
  );
  const handleRetry = useCallback(() => void detail.refetch(), [detail]);

  return (
    <AppSheet
      open={planId !== null}
      onOpenChange={onOpenChange}
      title={plan?.name ?? "Commission plan"}
      description={plan?.description ?? undefined}
      footer={
        plan && canManage ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleEditPlan}>
              Edit plan
            </Button>
            <Button type="button" variant="outline" onClick={handleNewVersion}>
              New version
            </Button>
            <Button type="button" onClick={handleAssign} disabled={plan.retiredOn !== null}>
              Assign
            </Button>
          </div>
        ) : undefined
      }
    >
      {detail.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : detail.error ? (
        <ErrorState title="Couldn't load this plan" error={detail.error} onRetry={handleRetry} />
      ) : plan ? (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Versions</h3>
            {versions.map((version) => (
              <div
                key={version.planVersionId}
                className="flex flex-col gap-1 rounded-xl border border-border bg-surface-inset p-3 text-sm dark:border-background"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{`Version ${version.versionNumber} · from ${formatDay(version.effectiveFrom, locale)}`}</span>
                  {version.sealedAt ? (
                    <Badge variant="secondary">Sealed</Badge>
                  ) : canManage ? (
                    <Button variant="ghost" size="sm" data-version-id={version.planVersionId} onClick={handleEditVersion}>
                      Edit
                    </Button>
                  ) : null}
                </div>
                <div className="text-muted-foreground">
                  {`${version.rules.period.toLowerCase()} · ${version.rules.tiers.map((tier) => formatBps(tier.rateBps)).join(" / ")}`}
                  {version.rules.quotaMinor !== null
                    ? ` · quota ${formatMinor(version.rules.quotaMinor, plan.currency, locale)}`
                    : ""}
                </div>
                {version.note ? <p>{version.note}</p> : null}
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Assigned</h3>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nobody is paid under this plan yet.</p>
            ) : (
              assignments.map((row) => (
                <div
                  key={row.assignmentId}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-inset p-3 text-sm dark:border-background"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{nameOf(row.userId)}</span>
                    <span className="text-muted-foreground">
                      {row.effectiveTo
                        ? formatPeriodRange(row.effectiveFrom, row.effectiveTo, locale)
                        : `From ${formatDay(row.effectiveFrom, locale)}`}
                      {row.quotaOverrideMinor !== null
                        ? ` · own quota ${formatMinor(row.quotaOverrideMinor, plan.currency, locale)}`
                        : ""}
                    </span>
                  </div>
                  {canManage && row.effectiveTo === null ? (
                    <Button variant="ghost" size="sm" data-assignment-id={row.assignmentId} onClick={handleEnd}>
                      End
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </section>
        </div>
      ) : null}

      {plan && dialog?.kind === "edit" ? (
        <EditCommissionPlanDialog
          planId={plan.planId}
          initial={{ name: plan.name, description: plan.description ?? "", retiredOn: plan.retiredOn ?? "" }}
          onOpenChange={handleDialogOpenChange}
        />
      ) : null}
      {plan && dialog?.kind === "assign" ? (
        <AssignCommissionPlanDialog planId={plan.planId} currency={plan.currency} onOpenChange={handleDialogOpenChange} />
      ) : null}
      {dialog?.kind === "end" ? (
        <EndCommissionAssignmentDialog
          assignmentId={dialog.assignmentId}
          personName={dialog.personName}
          onOpenChange={handleDialogOpenChange}
        />
      ) : null}
    </AppSheet>
  );
}
