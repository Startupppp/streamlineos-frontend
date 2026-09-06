"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Switch } from "@/components/ui/switch";
import { ErrorState } from "@/components/shared";
import { RecordList } from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import {
  useCrmMetadata,
  useDeleteValidationRule,
  useUpdateValidationRule,
  useValidationRules,
} from "@/hooks/api/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import { VALIDATION_RULE_LAYOUT } from "@/lib/renderer/crm/settings/validation-rule-layout";
import type { CrmValidationEntityType, CrmValidationRule } from "@/types/crm/metadata";
import { RecordRowActions } from "./shared/record-row-actions";
import { ValidationRuleSheet } from "./validation-rule-sheet";
import { ValidationRuleTestPanel } from "./validation-rule-test-panel";

/**
 * The rules for one entity type.
 *
 * Both halves are generated now. The sheet used to be hand-written because a
 * rule's config fields depend on its `ruleType` and a `FieldSpec` could not say
 * "only when"; `visibleWhen` closed that, so what is left here is the list, the
 * one-click activate switch, and confirming a delete.
 *
 * The pipeline column is a `reference` whose name the description points at, so
 * the row shows the pipeline rather than its identifier without this file
 * formatting anything.
 */

interface ValidationRuleListProps {
  entityType: CrmValidationEntityType;
  canManage: boolean;
}

export function ValidationRuleList({ entityType, canManage }: ValidationRuleListProps) {
  const layout = useTenantLayout(VALIDATION_RULE_LAYOUT);
  const { data, isLoading, isError, refetch, access} = useValidationRules({ entity: entityType });
  const { data: metadata } = useCrmMetadata();
  const updateRule = useUpdateValidationRule();
  const deleteRule = useDeleteValidationRule();

  const [editTarget, setEditTarget] = useState<CrmValidationRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CrmValidationRule | null>(null);

  const rules = useMemo(() => data ?? [], [data]);

  const pipelineNames = useMemo(
    () => new Map((metadata?.pipelines ?? []).map((pipeline) => [pipeline.id, pipeline.name])),
    [metadata],
  );

  const rows = useMemo(
    () =>
      rules.map((rule) => ({
        id: rule.id,
        field: rule.field,
        ruleType: rule.ruleType,
        pipelineId: rule.pipelineId ?? "",
        pipelineName: rule.pipelineId ? (pipelineNames.get(rule.pipelineId) ?? "") : "",
        stageKey: rule.stageKey ?? "",
        sourceKey: rule.sourceKey ?? "",
        errorMessage: rule.errorMessage ?? "",
        isActive: rule.isActive,
        sortOrder: rule.sortOrder,
      })),
    [rules, pipelineNames],
  );

  const handleToggle = useCallback(
    (rule: CrmValidationRule) => {
      updateRule.mutate(
        { id: rule.id, isActive: !rule.isActive },
        {
          onSuccess: () => toast.success(rule.isActive ? "Rule paused" : "Rule active"),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [updateRule],
  );

  const handleEditOpenChange = useCallback((open: boolean) => {
    if (!open) setEditTarget(null);
  }, []);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

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
          editLabel={`Edit the ${rule.ruleType} rule on ${rule.field}`}
          deleteLabel={`Delete the ${rule.ruleType} rule on ${rule.field}`}
          leading={
            <Switch
              checked={rule.isActive}
              onCheckedChange={() => handleToggle(rule)}
              aria-label={rule.isActive ? "Pause this rule" : "Activate this rule"}
            />
          }
          onEdit={() => setEditTarget(rule)}
          onDelete={() => setDeleteTarget(rule)}
        />
      );
    },
    [rules, canManage, handleToggle],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-gap-section">
      {isLoading ? (
        <DataTableSkeleton rows={10} columns={layout.list.columns.length} className="flex-1" />
      ) : isError ? (
        <ErrorState
          title="Couldn't load validation rules"
          description="The rule list didn't load. Check your connection and try again."
          onRetry={() => void refetch()}
          className="flex-1"
        />
      ) : rows.length === 0 ? (
        <EmptyState
            access={access}
          compact
          illustrationPreset="settings"
          title={`No rules on ${entityType}s yet`}
          description="A rule refuses a record that would otherwise be saved half-filled — a lead with no email, a deal with no close date."
          className="flex-1"
        />
      ) : (
        <RecordList
          layout={layout}
          rows={rows}
          getRowKey={(row) => String(row.id)}
          actions={rowActions}
          density="compact"
          minWidth="960px"
          className="flex-1 min-h-0"
        />
      )}

      <ValidationRuleTestPanel entityType={entityType} />

      {editTarget ? (
        <ValidationRuleSheet
          open
          onOpenChange={handleEditOpenChange}
          entityType={entityType}
          rule={editTarget}
          sortOrder={rules.length}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Delete this rule?"
        description={
          deleteTarget
            ? `The ${deleteTarget.ruleType} rule on ${deleteTarget.field} will be deleted and records that would have failed it will save. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete rule"
        destructive
        isPending={deleteRule.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
