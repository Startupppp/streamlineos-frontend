"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { RecordList, asRecordValues } from "@/features/renderer";
import { DensityToggle, useDensity } from "@/features/renderer/density-toggle";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { RecordRowActions } from "@/features/crm/settings/shared/record-row-actions";
import { ScoringRuleSheet } from "@/features/crm/settings/scoring-rules/scoring-rule-sheet";
import { ScoringRulePreviewPanel } from "@/features/crm/settings/scoring-rules/scoring-rule-preview-panel";
import { useCan } from "@/hooks/api/access";
import {
  useDeleteScoringRule,
  useScoringRules,
  type ScoringRule,
} from "@/hooks/api/crm-settings";
import { getErrorMessage } from "@/lib/get-error-message";
import { SCORING_RULE_LAYOUT } from "@/lib/renderer/crm/settings/scoring-rule-layout";

/**
 * Lead scoring rules.
 *
 * The table is the platform's one `DataTable`, driven by the description — the
 * screen this replaces rendered a raw shadcn `<Table>` with its own header
 * classes, because one of its rows could turn into a form and a `DataTable` cell
 * cannot. Editing moved to a sheet, and the table went back to being a table.
 */
export default function ScoringRulesPage() {
  const layout = useTenantLayout(SCORING_RULE_LAYOUT);
  const [density, setDensity] = useDensity();
  const canManage = useCan("crm:scoring-rules:manage");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ScoringRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScoringRule | null>(null);

  const { data, isLoading, isError, refetch } = useScoringRules();
  const deleteRule = useDeleteScoringRule();

  const rules = useMemo(() => data ?? [], [data]);

  const handleOpenCreate = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditTarget(null);
  }, []);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteRule.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Rule deleted");
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeleteTarget(null);
      },
    });
  }, [deleteRule, deleteTarget]);

  const rowActions = useCallback(
    (row: Record<string, unknown>) => {
      const rule = rules.find((candidate) => candidate.id === row.id);
      if (!rule || !canManage) return null;
      return (
        <RecordRowActions
          editLabel="Edit this rule"
          deleteLabel="Delete this rule"
          onEdit={() => {
            setEditTarget(rule);
            setSheetOpen(true);
          }}
          onDelete={() => setDeleteTarget(rule)}
        />
      );
    },
    [rules, canManage],
  );

  return (
    <PageWrapper
      title="Lead scoring"
      subtitle="What makes a lead worth calling first."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      }
      actions={
        canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            onClick={handleOpenCreate}
          >
            New rule
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-gap-section">
        {!canManage ? (
          <NoPermissionState
            permission="crm:scoring-rules:manage"
            className={CONTENT_FILL_PANEL}
            description="Lead scoring is set by your sales operations team."
          />
        ) : isLoading ? (
          <DataTableSkeleton rows={10} columns={layout.list.columns.length} className="flex-1" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load scoring rules"
            description="The rule list didn't load. Check your connection and try again."
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : rules.length === 0 ? (
          <EmptyState
            illustrationPreset="automations"
            title="No scoring rules yet"
            description="A rule adds or subtracts points when a lead matches it — a referral is worth more than a cold form fill, and the score says so."
            action={{ label: "New rule", onClick: handleOpenCreate }}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <>
            <RecordList
              layout={layout}
              rows={asRecordValues(rules)}
              getRowKey={(row) => String(row.id)}
              actions={rowActions}
              density={density}
              minWidth="720px"
              className={CONTENT_FILL_PANEL}
            />
            <ScoringRulePreviewPanel rules={rules} />
          </>
        )}
      </div>

      <ScoringRuleSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        rule={editTarget}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Delete this rule?"
        description={
          deleteTarget
            ? `Leads will stop earning ${deleteTarget.points} points for this condition. Existing scores are recalculated. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete rule"
        destructive
        isPending={deleteRule.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
