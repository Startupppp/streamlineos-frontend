"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useEnabledModules } from "@/hooks/api/access/org-modules";
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
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { NON_CRM_TRIGGER_META } from "@/components/automations/automation-trigger-data";
import { AutomationBuilderSheet } from "@/components/automations/automation-builder-sheet";
import {
  AutomationCardItem,
  ModuleDisabledCard,
} from "@/features/shared/automations/module-automations-settings";
import { SupportAutomationRunsDialog } from "./support-automation-runs-dialog";
import {
  useSupportAutomations,
  useToggleSupportAutomation,
  useDeleteSupportAutomation,
  useCreateSupportAutomation,
  useUpdateSupportAutomation,
  useTestSupportAutomation,
} from "@/hooks/api/support-automations";
import type { AutomationRule } from "@/hooks/api/automations";
import { matchesOrgModule } from "@/lib/org-module-keys";

const SUPPORT_TRIGGER_OPTIONS = NON_CRM_TRIGGER_META.filter((t) => t.module === "support");

export function SupportAutomationsSettings() {
  const { data: automationsData, isLoading, isError, refetch } = useSupportAutomations({ limit: 100 });
  const toggle = useToggleSupportAutomation();
  const remove = useDeleteSupportAutomation();
  const create = useCreateSupportAutomation();
  const update = useUpdateSupportAutomation();
  const test = useTestSupportAutomation();
  const enabledModules = useEnabledModules();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AutomationRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AutomationRule | null>(null);
  const [runsTarget, setRunsTarget] = useState<AutomationRule | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const moduleEnabled = matchesOrgModule(enabledModules, "HELPDESK");
  const rules = automationsData?.data ?? [];

  function handleToggle(rule: AutomationRule, next: boolean) {
    setTogglingId(rule.id);
    toggle.mutate(
      { id: rule.id, isEnabled: next },
      {
        onSuccess: () => toast.success(next ? "Automation enabled" : "Automation disabled"),
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
    <PageWrapper title="Automations" subtitle="Automation rules for support ticket events">
      {isLoading ? (
        <LoadingState variant="list" rows={12} />
      ) : isError ? (
        <ErrorState
          title="Couldn't load automations"
          description="Something went wrong while fetching your automation rules."
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : !moduleEnabled ? (
        <ModuleDisabledCard name="Support" />
      ) : (
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          <div className="flex items-center justify-end">
            <AnimatedIconButton
              icon={PlusIcon}
              iconSize={16}
              iconClassName="mr-1.5"
              size="sm"
              onClick={handleOpenCreate}
            >
              New Rule
            </AnimatedIconButton>
          </div>
          {rules.length === 0 ? (
            <div className="flex flex-1 min-h-0 flex-col">
              <EmptyState
                illustration={<EmptyActivityIllustration />}
                title="No Support automation rules yet"
                description="Create a rule to automate actions on support ticket events."
                action={{ label: "New Rule", onClick: handleOpenCreate }}
                className="w-full"
              />
            </div>
          ) : (
            rules.map((rule) => (
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
          triggerOptions={SUPPORT_TRIGGER_OPTIONS}
          defaultTrigger="ticket.created"
          create={create}
          update={update}
          test={test}
        />
      )}
      {editTarget && (
        <AutomationBuilderSheet
          rule={editTarget}
          onClose={handleCloseEdit}
          triggerOptions={NON_CRM_TRIGGER_META}
          create={create}
          update={update}
          test={test}
        />
      )}
      {runsTarget && (
        <SupportAutomationRunsDialog
          automationId={runsTarget.id}
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
