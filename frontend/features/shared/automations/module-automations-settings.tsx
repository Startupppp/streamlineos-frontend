"use client";

import { useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useEnabledModules } from "@/hooks/api/access/org-modules";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { Plus, Pencil, Trash2, History, Building2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  useAutomations,
  useToggleAutomation,
  useDeleteAutomation,
  type AutomationRule,
  type AutomationTrigger,
} from "@/hooks/api/automations";
import {
  TRIGGER_META,
  ACTION_TYPES,
  NON_CRM_TRIGGER_META,
  getModuleForTrigger,
} from "@/components/automations/automation-meta";
import { AutomationBuilderSheet } from "@/components/automations/automation-builder-sheet";
import { AutomationRunsDialog } from "@/components/automations/automation-runs-dialog";

export type SectionModule = "hr" | "support" | "finance";

const SECTION_DEFAULT_TRIGGER: Record<SectionModule, AutomationTrigger> = {
  hr: "candidate.application_created",
  support: "ticket.created",
  finance: "invoice.overdue",
};

export interface ModuleAutomationsConfig {
  sectionModule: SectionModule;
  moduleLabel: string;
  moduleEnabledKey: string;
  subtitle: string;
}

function triggerLabel(value: AutomationRule["triggerEvent"]) {
  return TRIGGER_META.find((t) => t.value === value)?.label ?? value;
}

function actionSummary(actions: AutomationRule["actions"]) {
  if (actions.length === 0) return "No actions";
  return actions
    .map((a) => ACTION_TYPES.find((t) => t.value === a.type)?.label ?? a.type)
    .join(", ");
}

function ModuleDisabledCard({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[24vh] gap-4 py-12">
      <Building2 className="h-9 w-9 text-muted-foreground/40" />
      <div className="text-center">
        <p className="font-semibold text-sm text-foreground">{name} module not enabled</p>
        <p className="text-xs text-muted-foreground mt-1">
          Enable this module in settings to manage its automation rules.
        </p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href="/settings/modules">Manage Modules</Link>
      </Button>
    </div>
  );
}

function AutomationCard({
  rule,
  onEdit,
  onDelete,
  onViewRuns,
  onToggle,
  isToggling,
}: {
  rule: AutomationRule;
  onEdit: () => void;
  onDelete: () => void;
  onViewRuns: () => void;
  onToggle: (next: boolean) => void;
  isToggling: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm truncate">{rule.name}</p>
              <Badge variant="secondary" className="text-[10px]">
                {triggerLabel(rule.triggerEvent)}
              </Badge>
              {!rule.isEnabled && (
                <Badge variant="outline" className="text-[10px]">
                  Disabled
                </Badge>
              )}
            </div>
            {rule.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {rule.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              <span className="font-medium text-foreground/70">Actions:</span>{" "}
              {actionSummary(rule.actions)}
            </p>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
              <span>{rule.runCount} runs</span>
              <span>
                {rule.lastRunAt
                  ? `Last run ${format(new Date(rule.lastRunAt), "MMM d, HH:mm")}`
                  : "Never run"}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Switch
              checked={rule.isEnabled}
              disabled={isToggling}
              onCheckedChange={onToggle}
              aria-label="Toggle automation"
            />
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onViewRuns}>
                <History className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AutomationCardItem({
  rule,
  togglingId,
  onToggle,
  onEdit,
  onDelete,
  onViewRuns,
}: {
  rule: AutomationRule;
  togglingId: number | null;
  onToggle: (rule: AutomationRule, next: boolean) => void;
  onEdit: (rule: AutomationRule) => void;
  onDelete: (rule: AutomationRule) => void;
  onViewRuns: (rule: AutomationRule) => void;
}) {
  function handleToggle(next: boolean) {
    onToggle(rule, next);
  }
  function handleEdit() {
    onEdit(rule);
  }
  function handleDelete() {
    onDelete(rule);
  }
  function handleViewRuns() {
    onViewRuns(rule);
  }

  return (
    <AutomationCard
      rule={rule}
      isToggling={togglingId === rule.id}
      onToggle={handleToggle}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onViewRuns={handleViewRuns}
    />
  );
}

export function ModuleAutomationsSettings({ config }: { config: ModuleAutomationsConfig }) {
  const { sectionModule, moduleLabel, moduleEnabledKey, subtitle } = config;
  const { data: rules, isLoading, isError, refetch } = useAutomations();
  const toggle = useToggleAutomation();
  const remove = useDeleteAutomation();
  const enabledModules = useEnabledModules();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AutomationRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AutomationRule | null>(null);
  const [runsTarget, setRunsTarget] = useState<AutomationRule | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const moduleEnabled =
    enabledModules.length === 0 || enabledModules.includes(moduleEnabledKey.toUpperCase());

  const moduleRules = (rules ?? []).filter(
    (r) => getModuleForTrigger(r.triggerEvent) === sectionModule,
  );

  const triggerOptions = NON_CRM_TRIGGER_META.filter((t) => t.module === sectionModule);

  function handleToggle(rule: AutomationRule, next: boolean) {
    setTogglingId(rule.id);
    toggle.mutate(
      { id: rule.id, isEnabled: next },
      {
        onSuccess: () =>
          toast.success(next ? "Automation enabled" : "Automation disabled"),
        onError: () => toast.error("Failed to update automation"),
        onSettled: () => setTogglingId(null),
      },
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Automation deleted");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete automation"),
    });
  }

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  function handleCloseCreate() {
    setCreateOpen(false);
  }

  function handleCloseEdit() {
    setEditTarget(null);
  }

  function handleCloseRuns() {
    setRunsTarget(null);
  }

  function handleRetry() {
    void refetch();
  }

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  return (
    <PageWrapper title="Automations" subtitle={subtitle}>
      {isLoading ? (
        <LoadingState variant="list" rows={5} />
      ) : isError ? (
        <ErrorState
          title="Couldn't load automations"
          description="Something went wrong while fetching your automation rules."
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : !moduleEnabled ? (
        <ModuleDisabledCard name={moduleLabel} />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-end">
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-1" /> New Rule
            </Button>
          </div>
          {moduleRules.length === 0 ? (
            <div className="flex min-h-[20vh]">
              <EmptyState
                illustration={<EmptyActivityIllustration />}
                title={`No ${moduleLabel} automation rules yet`}
                description={`Create a rule to automate actions on ${moduleLabel} events.`}
                action={{ label: "New Rule", onClick: handleOpenCreate }}
                className="w-full"
              />
            </div>
          ) : (
            moduleRules.map((rule) => (
              <AutomationCardItem
                key={rule.id}
                rule={rule}
                togglingId={togglingId}
                onToggle={handleToggle}
                onEdit={setEditTarget}
                onDelete={setDeleteTarget}
                onViewRuns={setRunsTarget}
              />
            ))
          )}
        </div>
      )}

      {createOpen && (
        <AutomationBuilderSheet
          onClose={handleCloseCreate}
          triggerOptions={triggerOptions}
          defaultTrigger={SECTION_DEFAULT_TRIGGER[sectionModule]}
        />
      )}
      {editTarget && (
        <AutomationBuilderSheet
          rule={editTarget}
          onClose={handleCloseEdit}
          triggerOptions={NON_CRM_TRIGGER_META}
        />
      )}
      {runsTarget && (
        <AutomationRunsDialog
          ruleId={runsTarget.id}
          ruleName={runsTarget.name}
          onClose={handleCloseRuns}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete automation?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; and its run history will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
