"use client";

import { useState } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageState } from "@/components/shared/page-state";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useHrAutomationEvents,
  useHrAutomations,
  useToggleHrAutomation,
  useDeleteHrAutomation,
} from "@/hooks/api/hr/hr-automations";
import { AutomationUpsertSheet } from "@/features/hr/automations/automation-upsert-sheet";
import { AutomationRunsSheet } from "@/features/hr/automations/automation-runs-sheet";
import { AutomationTestDialog } from "@/features/hr/automations/automation-test-dialog";
import { AutomationRuleCard } from "@/features/hr/automations/automation-rule-card";
import type { HrAutomationRule } from "@/types/hr/automations";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";

export function AutomationsSettingsPage() {
  const canManage = useCan("hr:automations:manage");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [triggerFilter, setTriggerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HrAutomationRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HrAutomationRule | null>(null);
  const [runsTarget, setRunsTarget] = useState<HrAutomationRule | null>(null);
  const [testTarget, setTestTarget] = useState<HrAutomationRule | null>(null);

  const enabledFilter = statusFilter === "enabled" ? true : statusFilter === "disabled" ? false : undefined;

  const { data: rules, isLoading, isError, error, refetch } = useHrAutomations({
    search: debouncedSearch.trim() || undefined,
    triggerEvent: triggerFilter === "all" ? undefined : triggerFilter,
    isEnabled: enabledFilter,
  });
  const { data: eventCatalog } = useHrAutomationEvents();
  const triggerEvents = eventCatalog?.events.map((e) => e.value) ?? [];

  const toggle = useToggleHrAutomation();
  const remove = useDeleteHrAutomation();

  const stats = {
    total: rules?.length ?? 0,
    enabled: rules?.filter((r) => r.isEnabled).length ?? 0,
    totalRuns: rules?.reduce((sum, r) => sum + r.runCount, 0) ?? 0,
  };

  function handleToggle(rule: HrAutomationRule, next: boolean) {
    setTogglingId(rule.id);
    toggle.mutate(
      { automationId: rule.id, isEnabled: next },
      {
        onSuccess: () => toast.success(next ? "Automation enabled" : "Automation disabled"),
        onError: (err) => toast.error(getErrorMessage(err)),
        onSettled: () => setTogglingId(null),
      },
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Automation deleted"); setDeleteTarget(null); },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function handleTriggerChange(value: string) {
    setTriggerFilter(value);
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
  }

  function handleOpenCreate() { setCreateOpen(true); }
  function handleCloseCreate() { setCreateOpen(false); }
  function handleCloseEdit() { setEditTarget(null); }
  function handleCloseRuns() { setRunsTarget(null); }
  function handleCloseTest() { setTestTarget(null); }
  function handleDeleteDialogChange(open: boolean) { if (!open) setDeleteTarget(null); }
  function handleRetry() { void refetch(); }

  const pageState = usePageState({ permission: "hr:automations:view", isLoading: false, isError, error });

  return (
    <PageWrapper
      title="HR Automations"
      subtitle="Configure rules that fire automatically on HR events"
      actions={
        canManage ? (
          <AnimatedIconButton icon={PlusIcon} size="sm" iconSize={16} onClick={handleOpenCreate}>
            {" Create automation"}
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
        {stats.total > 0 && (
          <div className="flex items-center gap-6 py-2 mb-2 text-xs text-muted-foreground">
            <span><span className="font-semibold text-foreground">{stats.total}</span> rules</span>
            <span><span className="font-semibold text-foreground">{stats.enabled}</span> enabled</span>
            <span><span className="font-semibold text-foreground">{stats.totalRuns}</span> total runs</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <SearchInput
            placeholder="Search rules…"
            value={search}
            onValueChange={handleSearchChange}
           />
          <Select value={triggerFilter} onValueChange={handleTriggerChange}>
            <SelectTrigger className="sm:w-52">
              <SelectValue placeholder="All triggers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All triggers</SelectItem>
              {triggerEvents.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="sm:w-36">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="enabled">Enabled</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <LoadingState variant="list" rows={12} />
        ) : !rules || rules.length === 0 ? (
          debouncedSearch.trim() || triggerFilter !== "all" || statusFilter !== "all" ? (
            <EmptyState
              illustrationPreset="automations"
              title="No rules match these filters"
              description="Change the search or filters to see other rules."
              className="flex-1"
            />
          ) : (
            <EmptyState
              illustrationPreset="automations"
              title="No HR automation rules yet"
              description="Create a rule to automatically trigger actions on HR events like onboarding, leave, or resignation."
              action={canManage ? { label: "Create automation", onClick: handleOpenCreate } : undefined}
              className="flex-1"
            />
          )
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <AutomationRuleCard
                key={rule.id}
                rule={rule}
                isToggling={togglingId === rule.id}
                canManage={canManage}
                onToggle={(next) => handleToggle(rule, next)}
                onEdit={() => setEditTarget(rule)}
                onDelete={() => setDeleteTarget(rule)}
                onViewRuns={() => setRunsTarget(rule)}
                onTest={() => setTestTarget(rule)}
              />
            ))}
          </div>
        )}

        {createOpen && <AutomationUpsertSheet onClose={handleCloseCreate} />}
        {editTarget && <AutomationUpsertSheet rule={editTarget} onClose={handleCloseEdit} />}
        {runsTarget && <AutomationRunsSheet ruleId={runsTarget.id} ruleName={runsTarget.name} onClose={handleCloseRuns} />}
        {testTarget && <AutomationTestDialog rule={testTarget} onClose={handleCloseTest} />}
      </PageState>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Delete automation rule?"
        description={`"${deleteTarget?.name ?? ""}" and its run history will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        isPending={remove.isPending}
        keepOpenOnConfirm
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
