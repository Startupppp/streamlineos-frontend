"use client";

import { useState } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { useCan } from "@/hooks/api/access";
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
import type { HrAutomationRule } from "@/types/hr/automations";
import { toast } from "sonner";
import { format } from "date-fns";
import { Pencil, History } from "lucide-react";
import { PlayIcon, Trash2Icon, PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { TruncatedText } from "@/components/ui/truncated-text";

function RuleCard({
  rule,
  onEdit,
  onDelete,
  onViewRuns,
  onTest,
  onToggle,
  isToggling,
  canManage,
}: {
  rule: HrAutomationRule;
  onEdit: () => void;
  onDelete: () => void;
  onViewRuns: () => void;
  onTest: () => void;
  onToggle: (next: boolean) => void;
  isToggling: boolean;
  canManage: boolean;
}) {
  function handleToggleChange(next: boolean) {
    onToggle(next);
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
              <TruncatedText text={rule.name} className="font-medium text-sm" />
              <Badge variant="secondary" className="text-[10px]">{rule.triggerEvent}</Badge>
              {!rule.isEnabled && <Badge variant="outline" className="text-[10px]">Disabled</Badge>}
            </div>
            {rule.description && (
              <TruncatedText text={rule.description} className="text-xs text-muted-foreground mt-0.5" />
            )}
            <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
              <span>{rule.conditions.length} condition{rule.conditions.length !== 1 ? "s" : ""}</span>
              <span>{rule.actions.length} action{rule.actions.length !== 1 ? "s" : ""}</span>
              <span>{rule.runCount} run{rule.runCount !== 1 ? "s" : ""}</span>
              <span>{rule.lastRunAt ? `Last: ${format(new Date(rule.lastRunAt), "MMM d, HH:mm")}` : "Never run"}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Switch
              checked={rule.isEnabled}
              disabled={isToggling || !canManage}
              onCheckedChange={handleToggleChange}
              aria-label="Toggle automation"
            />
            <div className="flex items-center gap-1">
              <TooltipIconButton label="View Runs" className="w-7" onClick={onViewRuns}>
                <History className="h-3.5 w-3.5" />
              </TooltipIconButton>
              {canManage && (
                <>
                  <TooltipIconButton icon={PlayIcon} iconSize={14} label="Dry-Run Test" className="w-7" onClick={onTest} />
                  <TooltipIconButton label="Edit" className="w-7" onClick={onEdit}>
                    <Pencil className="h-3.5 w-3.5" />
                  </TooltipIconButton>
                  <TooltipIconButton
                    icon={Trash2Icon}
                    iconSize={14}
                    label="Delete"
                    className="w-7 text-destructive hover:text-destructive"
                    onClick={onDelete}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HrAutomationsPage() {
  const canView = useCan("hr:automations:view");
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

  const { data: rules, isLoading, isError, refetch } = useHrAutomations({
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
      { id: rule.id, isEnabled: next },
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
      onError: (err) => { toast.error(getErrorMessage(err)); setDeleteTarget(null); },
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

  if (!canView) {
    return (
      <PageWrapper title="HR Automations" subtitle="Configure rules that fire automatically on HR events">
        <NoPermissionState
          permission="hr:automations:view"
          title="Access Restricted"
          description="You don't have permission to view HR automation rules. HR Admin role is required."
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="HR Automations"
      subtitle="Configure rules that fire automatically on HR events"
      actions={
        canManage ? (
          <AnimatedIconButton icon={PlusIcon} size="sm" iconSize={16} onClick={handleOpenCreate}>
            {" New Rule"}
          </AnimatedIconButton>
        ) : undefined
      }
    >
      {stats.total > 0 && (
        <div className="flex items-center gap-6 py-2 mb-2 text-xs text-muted-foreground">
          <span><span className="font-semibold text-foreground">{stats.total}</span> rules</span>
          <span><span className="font-semibold text-foreground">{stats.enabled}</span> enabled</span>
          <span><span className="font-semibold text-foreground">{stats.totalRuns}</span> total runs</span>
        </div>
      )}

      {!isError && (
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
      )}
      {isLoading ? (
        <LoadingState variant="list" rows={12} />
      ) : isError ? (
        <ErrorState
          title="Couldn't load automation rules"
          description="Something went wrong while fetching your HR automation rules."
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : !rules || rules.length === 0 ? (
        <EmptyState
          illustrationPreset="automations"
          title="No HR automation rules yet"
          description="Create a rule to automatically trigger actions on HR events like onboarding, leave, or resignation."
          action={{ label: "New Rule", onClick: handleOpenCreate }}
          className="flex-1"
        />
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
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

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete automation rule?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; and its run history will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
