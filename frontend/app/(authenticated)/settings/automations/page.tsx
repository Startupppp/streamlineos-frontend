"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
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
import { Plus, Pencil, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  useAutomations,
  useToggleAutomation,
  useDeleteAutomation,
  type AutomationRule,
} from "@/hooks/api/automations";
<<<<<<< Updated upstream
import {
  TRIGGER_META,
  ACTION_TYPES,
} from "@/components/automations/automation-meta";
=======
import { TRIGGER_META, ACTION_TYPES } from "@/components/automations/automation-meta";
>>>>>>> Stashed changes
import { AutomationBuilderSheet } from "@/components/automations/automation-builder-sheet";
import { AutomationRunsDialog } from "@/components/automations/automation-runs-dialog";

function triggerLabel(value: AutomationRule["triggerEvent"]) {
  return TRIGGER_META.find((t) => t.value === value)?.label ?? value;
}

function actionSummary(actions: AutomationRule["actions"]) {
  if (actions.length === 0) return "No actions";
  return actions
    .map((a) => ACTION_TYPES.find((t) => t.value === a.type)?.label ?? a.type)
    .join(", ");
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
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={onViewRuns}
              >
                <History className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={onEdit}
              >
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

export default function AutomationsPage() {
  const { data: rules, isLoading, isError, refetch } = useAutomations();
  const toggle = useToggleAutomation();
  const remove = useDeleteAutomation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AutomationRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AutomationRule | null>(null);
  const [runsTarget, setRunsTarget] = useState<AutomationRule | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

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

  function handleSetEditTarget(rule: AutomationRule) {
    setEditTarget(rule);
  }

  function handleSetDeleteTarget(rule: AutomationRule) {
    setDeleteTarget(rule);
  }

  function handleSetRunsTarget(rule: AutomationRule) {
    setRunsTarget(rule);
  }

  function handleRetry() {
    void refetch();
  }

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  return (
    <PageWrapper
      title="Automations"
      subtitle="Trigger notifications, emails, tasks and webhooks automatically on CRM events"
      actions={
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" /> New Automation
        </Button>
      }
    >
      {isLoading ? (
        <LoadingState variant="list" rows={5} />
      ) : isError ? (
        <ErrorState
          title="Couldn't load automations"
          description="Something went wrong while fetching your automation rules."
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : !rules || rules.length === 0 ? (
        <div className="flex flex-1 min-h-[60vh]">
          <EmptyState
            illustration={<EmptyActivityIllustration />}
            title="No automations yet"
            description="Create your first rule to react to leads, deals, tickets and invoices automatically."
            action={{ label: "New Automation", onClick: handleOpenCreate }}
            className="w-full"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <AutomationCardItem
              key={rule.id}
              rule={rule}
              togglingId={togglingId}
              onToggle={handleToggle}
              onEdit={handleSetEditTarget}
              onDelete={handleSetDeleteTarget}
              onViewRuns={handleSetRunsTarget}
            />
          ))}
        </div>
      )}

      {createOpen && <AutomationBuilderSheet onClose={handleCloseCreate} />}
      {editTarget && (
        <AutomationBuilderSheet rule={editTarget} onClose={handleCloseEdit} />
      )}
      {runsTarget && (
        <AutomationRunsDialog
          ruleId={runsTarget.id}
          ruleName={runsTarget.name}
          onClose={handleCloseRuns}
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete automation?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; and its run history will be
              permanently deleted.
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
