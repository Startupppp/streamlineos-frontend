"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTargetIllustration } from "@/components/illustrations";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Switch } from "@/components/ui/switch";
import { RecordList, type RecordValue } from "@/features/renderer";
import { DensityToggle, useDensity } from "@/features/renderer/density-toggle";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { RecordRowActions } from "@/features/crm/settings/shared/record-row-actions";
import { AssignmentRuleSheet } from "@/features/crm/settings/assignment-rule-sheet";
import { AssignmentRulePreviewPanel } from "./assignment-rule-preview-panel";
import { useCan } from "@/hooks/api/access";
import {
  useAssignmentRules,
  useCreateAssignmentRule,
  useDeleteAssignmentRule,
  useReorderAssignmentRules,
  useUpdateAssignmentRule,
  type AssignmentRule,
  type CreateAssignmentRuleInput,
} from "@/hooks/api/crm-settings";
import { getErrorMessage } from "@/lib/get-error-message";
import { queryKeys } from "@/lib/query-keys";
import { ASSIGNMENT_RULE_LAYOUT } from "@/lib/renderer/crm/settings/assignment-rule-layout";

/**
 * Assignment rules.
 *
 * The screen this replaces drew its own card per rule, its own badge for the
 * assignment type and its own "N conditions" line, and lived in `app/` at 429
 * lines. All three are the description now — the type is a `select` with its
 * labels, and the condition count is what a `lines` column reads.
 *
 * Order is the rule's priority, so it stays editable from the row. It moved
 * from drag to a pair of buttons deliberately: the list is a generated table
 * and, below the breakpoint, it is a stack of cards where a drag handle has
 * nowhere to drag to. Two buttons work on a phone, are reachable from a
 * keyboard, and say which direction they move — none of which was true of the
 * handle. Reordering itself is unchanged: the same optimistic write, the same
 * endpoint, the same rollback.
 */
export function AssignmentRulesPage() {
  const layout = useTenantLayout(ASSIGNMENT_RULE_LAYOUT);
  const [density, setDensity] = useDensity();
  const canManage = useCan("crm:assignment-rules:manage");
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<AssignmentRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssignmentRule | null>(null);

  /*
    No `access` here, and no `<Gated>` either, unlike the sibling settings pages.
    The route is a server component that calls
    `requirePermission("crm:assignment-rules:manage")` before this renders, so a
    caller without the permission is refused before the query is ever made --
    there is no denied-but-rendered state for an empty list to be confused with.
  */
  const { data, isLoading, isError, refetch } = useAssignmentRules();
  const createRule = useCreateAssignmentRule();
  const updateRule = useUpdateAssignmentRule();
  const deleteRule = useDeleteAssignmentRule();
  const reorderRules = useReorderAssignmentRules();

  const rules = useMemo(() => data ?? [], [data]);

  const rows = useMemo<RecordValue[]>(
    () =>
      rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        assignmentType: rule.assignmentType,
        priority: rule.priority,
        isActive: rule.isActive,
        conditions: rule.conditions,
      })),
    [rules],
  );

  const handleOpenCreate = useCallback(() => {
    setEditing(null);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditing(null);
  }, []);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleSubmit = useCallback(
    (input: Omit<CreateAssignmentRuleInput, "priority"> & { isActive: boolean }) => {
      if (editing) {
        updateRule.mutate(
          { id: editing.id, ...input },
          {
            onSuccess: () => {
              toast.success("Rule updated");
              setSheetOpen(false);
              setEditing(null);
            },
            onError: (error) => toast.error(getErrorMessage(error)),
          },
        );
        return;
      }

      createRule.mutate(
        { ...input, priority: rules.length },
        {
          onSuccess: () => {
            toast.success("Rule created");
            setSheetOpen(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [createRule, editing, rules.length, updateRule],
  );

  const handleToggleActive = useCallback(
    (rule: AssignmentRule) => {
      updateRule.mutate(
        { id: rule.id, isActive: !rule.isActive },
        {
          onSuccess: () => toast.success(rule.isActive ? "Rule paused" : "Rule activated"),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [updateRule],
  );

  /**
   * Moves a rule one place, optimistically.
   *
   * The list is the priority, so the row has to move before the round trip or
   * the person pressing the button watches nothing happen. A failure puts the
   * server's order back rather than leaving the optimistic one on screen.
   */
  const handleMove = useCallback(
    (rule: AssignmentRule, direction: -1 | 1) => {
      const from = rules.findIndex((candidate) => candidate.id === rule.id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= rules.length) return;

      const working = [...rules];
      const [moved] = working.splice(from, 1);
      if (!moved) return;
      working.splice(to, 0, moved);

      const reordered = working.map((candidate, index) => ({
        ...candidate,
        priority: working.length - index,
      }));
      queryClient.setQueryData(queryKeys.crmSettings.assignmentRules(), reordered);

      reorderRules.mutate(
        { ruleIds: reordered.map((candidate) => candidate.id) },
        {
          onError: (error) => {
            toast.error(getErrorMessage(error));
            queryClient.invalidateQueries({
              queryKey: queryKeys.crmSettings.assignmentRules(),
            });
          },
        },
      );
    },
    [queryClient, reorderRules, rules],
  );

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

  const leading = useCallback(
    (row: RecordValue) => {
      const index = rules.findIndex((candidate) => candidate.id === row.id);
      const rule = rules[index];
      if (!rule || !canManage) return null;

      return (
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={index === 0}
            aria-label={`Move ${rule.name} up`}
            onClick={() => handleMove(rule, -1)}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={index === rules.length - 1}
            aria-label={`Move ${rule.name} down`}
            onClick={() => handleMove(rule, 1)}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    },
    [canManage, handleMove, rules],
  );

  const rowActions = useCallback(
    (row: RecordValue) => {
      const rule = rules.find((candidate) => candidate.id === row.id);
      if (!rule || !canManage) return null;

      return (
        <RecordRowActions
          editLabel={`Edit ${rule.name}`}
          deleteLabel={`Delete ${rule.name}`}
          leading={
            <Switch
              checked={rule.isActive}
              onCheckedChange={() => handleToggleActive(rule)}
              aria-label={rule.isActive ? `Pause ${rule.name}` : `Activate ${rule.name}`}
            />
          }
          onEdit={() => {
            setEditing(rule);
            setSheetOpen(true);
          }}
          onDelete={() => setDeleteTarget(rule)}
        />
      );
    },
    [canManage, handleToggleActive, rules],
  );

  return (
    <PageWrapper
      title="Assignment rules"
      subtitle="Who a new lead goes to, decided by the first rule it matches."
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
            permission="crm:assignment-rules:manage"
            className={CONTENT_FILL_PANEL}
            description="Lead routing is managed by your sales operations team."
          />
        ) : isLoading ? (
          <DataTableSkeleton rows={8} columns={layout.list.columns.length} className="flex-1" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load assignment rules"
            description="The rule list didn't load. Check your connection and try again."
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            illustration={<EmptyTargetIllustration />}
            title="No assignment rules"
            description="A rule sends an incoming lead to the right person automatically — by source, by city, by value."
            action={{ label: "New rule", onClick: handleOpenCreate }}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <>
            <RecordList
              layout={layout}
              rows={rows}
              getRowKey={(row) => String(row.id)}
              leading={leading}
              actions={rowActions}
              density={density}
              minWidth="820px"
              className={CONTENT_FILL_PANEL}
            />
            <AssignmentRulePreviewPanel />
          </>
        )}
      </div>

      <AssignmentRuleSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        editing={editing}
        isPending={createRule.isPending || updateRule.isPending}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Delete this assignment rule?"
        description={
          deleteTarget
            ? `${deleteTarget.name} will be deleted and new leads will stop being routed by it. Leads already assigned keep their owner. This cannot be undone.`
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
