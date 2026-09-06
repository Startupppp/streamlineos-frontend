"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AutomationsIllustration } from "@/components/illustrations";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Switch } from "@/components/ui/switch";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { RecordList } from "@/features/renderer";
import { DensityToggle, useDensity } from "@/features/renderer/density-toggle";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { RecordRowActions } from "@/features/crm/settings/shared/record-row-actions";
import { useCan } from "@/hooks/api/access";
import {
  useAutomationEvents,
  useCrmAutomationRules,
  useDeleteCrmAutomationRule,
  useDisableCrmAutomationRule,
  useEnableCrmAutomationRule,
} from "@/hooks/api/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import { AUTOMATION_LAYOUT } from "@/lib/renderer/crm/settings/automation-layout";
import type { CrmAutomationRule } from "@/types/crm";

/**
 * Automations.
 *
 * The list is generated; the builder it opens is not, and is not going to be —
 * an automation is a graph of nodes and branches, which no field vocabulary
 * describes. What moved onto the engine is the part that was a table pretending
 * not to be one.
 *
 * A row's state is one badge instead of three separate signals — a "Draft" chip
 * beside the name, a version line under it and a switch in its own column all
 * said something about whether the rule was running.
 */
export default function AutomationsPage() {
  const router = useRouter();
  const layout = useTenantLayout(AUTOMATION_LAYOUT);
  const [density, setDensity] = useDensity();
  const canManage = useCan("crm:settings:manage");

  const { data, isLoading, isError, refetch, access} = useCrmAutomationRules();
  const { data: eventsData } = useAutomationEvents();
  const enableRule = useEnableCrmAutomationRule();
  const disableRule = useDisableCrmAutomationRule();
  const deleteRule = useDeleteCrmAutomationRule();

  const [deleteTarget, setDeleteTarget] = useState<CrmAutomationRule | null>(null);

  const rules = useMemo(() => data?.rules ?? [], [data]);

  const eventLabels = useMemo(
    () => new Map((eventsData?.events ?? []).map((event) => [event.key, event.label])),
    [eventsData],
  );

  const rows = useMemo(
    () =>
      rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        triggerLabel: eventLabels.get(rule.trigger) ?? rule.trigger,
        state: rule.isDraft ? "draft" : rule.isActive ? "live" : "paused",
        version: rule.version,
        executionCount: rule.executionCount,
        lastRunAt: rule.lastRunAt,
        cooldownMinutes: rule.cooldownMinutes,
      })),
    [rules, eventLabels],
  );

  const handleCreate = useCallback(
    () => router.push("/crm/settings/automations/new"),
    [router],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleToggle = useCallback(
    (rule: CrmAutomationRule) => {
      const mutation = rule.isActive ? disableRule : enableRule;
      mutation.mutate(rule.id, {
        onSuccess: () => toast.success(rule.isActive ? "Automation paused" : "Automation live"),
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    },
    [enableRule, disableRule],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteRule.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Automation deleted");
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeleteTarget(null);
      },
    });
  }, [deleteRule, deleteTarget]);

  const handleRowClick = useCallback(
    (row: Record<string, unknown>) => router.push(`/crm/settings/automations/${String(row.id)}`),
    [router],
  );

  const rowActions = useCallback(
    (row: Record<string, unknown>) => {
      const rule = rules.find((candidate) => candidate.id === row.id);
      if (!rule || !canManage) return null;
      return (
        <RecordRowActions
          editLabel={`Open ${rule.name} in the builder`}
          deleteLabel={`Delete ${rule.name}`}
          leading={
            <Switch
              checked={rule.isActive}
              onCheckedChange={() => handleToggle(rule)}
              aria-label={rule.isActive ? `Pause ${rule.name}` : `Start ${rule.name}`}
            />
          }
          onEdit={() => router.push(`/crm/settings/automations/${rule.id}`)}
          onDelete={() => setDeleteTarget(rule)}
        />
      );
    },
    [rules, canManage, handleToggle, router],
  );

  return (
    <PageWrapper
      title="Automations"
      subtitle="What the system does on its own when something happens in the CRM."
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
            onClick={handleCreate}
          >
            New automation
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!canManage ? (
          <NoPermissionState
            permission="crm:settings:manage"
            className={CONTENT_FILL_PANEL}
            description="Automations are managed by your sales operations team."
          />
        ) : isLoading ? (
          <DataTableSkeleton rows={10} columns={layout.list.columns.length} className="flex-1" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load automations"
            description="The automation list didn't load. Check your connection and try again."
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            access={access}
            illustration={<AutomationsIllustration />}
            title="No automations yet"
            description="An automation watches for something — a lead arriving, a deal moving — and does the next thing without anybody asking."
            action={{ label: "New automation", onClick: handleCreate }}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <RecordList
            layout={layout}
            rows={rows}
            getRowKey={(row) => String(row.id)}
            onRowClick={handleRowClick}
            actions={rowActions}
            density={density}
            minWidth="880px"
            className={CONTENT_FILL_PANEL}
          />
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Delete this automation?"
        description={
          deleteTarget
            ? `${deleteTarget.name} will be permanently deleted and will stop running on future triggers. Its run history goes with it. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete automation"
        destructive
        isPending={deleteRule.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
