"use client";

import { useCallback, useMemo, useState } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
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
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptySearchIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { RoutingRuleCard } from "./routing-rule-card";
import { RoutingRuleSheet } from "./routing-rule-sheet";
import {
  useDeleteRoutingRule,
  useRoutingRules,
  useUpdateRoutingRule,
  type SupportRoutingRule,
} from "@/hooks/api/support/macros";
import { useOrgMembers } from "@/hooks/api/organization";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

export function RoutingPage() {
  const { data: rules, isLoading, isError, refetch } = useRoutingRules();
  const { data: membersResponse } = useOrgMembers(1, 200);
  const members = useMemo(() => membersResponse?.data ?? [], [membersResponse]);
  const updateRule = useUpdateRoutingRule();
  const deleteRule = useDeleteRoutingRule();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SupportRoutingRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupportRoutingRule | null>(null);
  const [orderedRules, setOrderedRules] = useState<SupportRoutingRule[]>(rules ?? []);
  const [syncedRules, setSyncedRules] = useState(rules);
  if (rules !== syncedRules) {
    setSyncedRules(rules);
    setOrderedRules(rules ?? []);
  }

  const assigneeNameOf = useCallback(
    (id: string | null) => {
      if (!id) return null;
      const member = members.find((candidate) => candidate.userId === id);
      return member?.name ?? member?.email ?? id;
    },
    [members],
  );

  const handleToggle = useCallback(
    (rule: SupportRoutingRule) => {
      updateRule.mutate(
        { id: rule.id, isEnabled: !rule.isEnabled },
        { onError: (error) => toast.error(getErrorMessage(error)) },
      );
    },
    [updateRule],
  );

  const handleMove = useCallback(
    (index: number, direction: "up" | "down") => {
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= orderedRules.length) return;
      const next = [...orderedRules];
      [next[index], next[target]] = [next[target], next[index]];
      setOrderedRules(next);
      next.forEach((rule, ruleIndex) => {
        if (rule.sortOrder !== ruleIndex)
          updateRule.mutate(
            { id: rule.id, sortOrder: ruleIndex },
            { onError: (error) => toast.error(getErrorMessage(error)) },
          );
      });
    },
    [orderedRules, updateRule],
  );

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteRule.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Rule deleted");
        setDeleteTarget(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [deleteRule, deleteTarget]);

  return (
    <PageWrapper
      title="Routing Rules"
      subtitle="Auto-assign and prioritise incoming tickets"
      actions={
        <AnimatedIconButton size="sm" onClick={() => setCreateOpen(true)} icon={PlusIcon} iconClassName="mr-1.5">
          New Rule
        </AnimatedIconButton>
      }
    >
      {isLoading ? (
        <LoadingState variant="list" rows={12} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : orderedRules.length > 0 ? (
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          {orderedRules.map((rule, index) => (
            <RoutingRuleCard
              key={rule.id}
              rule={rule}
              index={index}
              total={orderedRules.length}
              assigneeName={assigneeNameOf(rule.assigneeId)}
              onToggle={handleToggle}
              onMove={handleMove}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          illustration={<EmptySearchIllustration />}
          title="No routing rules yet"
          description="Create rules to auto-assign and prioritise tickets as they arrive."
          action={{ label: "New Rule", onClick: () => setCreateOpen(true) }}
          className="flex-1"
        />
      )}
      {createOpen && <RoutingRuleSheet members={members} onClose={() => setCreateOpen(false)} />}
      {editTarget && <RoutingRuleSheet rule={editTarget} members={members} onClose={() => setEditTarget(null)} />}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete routing rule?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted.
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
