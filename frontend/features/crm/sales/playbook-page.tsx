"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useRemovePlaybookEntry, useSalesPlaybook } from "@/hooks/api/crm/sales";
import type { PlaybookEntry } from "@/hooks/api/crm/sales-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { PlaybookEntrySheet } from "./playbook-entry-sheet";

function groupByCategory(entries: PlaybookEntry[]) {
  const groups = new Map<string, PlaybookEntry[]>();
  for (const entry of entries) {
    const key = entry.category?.trim() || "General";
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  return [...groups.entries()];
}

const LOADING = (
  <div className="flex flex-col gap-3">
    {[0, 1, 2].map((i) => (
      <Skeleton key={i} className="h-28 w-full rounded-xl" />
    ))}
  </div>
);

/** The team's sales playbook. Everyone in sales reads it; `sales:manage` edits it. */
export function PlaybookPage() {
  const playbook = useSalesPlaybook();
  const canManage = useCan("sales:manage");
  const remove = useRemovePlaybookEntry();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlaybookEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlaybookEntry | null>(null);

  const entries = useMemo(() => playbook.data ?? [], [playbook.data]);
  const groups = useMemo(() => groupByCategory(entries), [entries]);
  const pageState = usePageState({
    permission: "sales:view",
    isLoading: playbook.isLoading,
    isError: playbook.isError,
    error: playbook.error,
    isEmpty: playbook.data !== undefined && entries.length === 0,
  });

  const findEntry = useCallback(
    (event: React.SyntheticEvent<HTMLElement>) =>
      entries.find((entry) => String(entry.id) === event.currentTarget.dataset.entryId) ?? null,
    [entries],
  );
  function handleCreate() {
    setEditTarget(null);
    setSheetOpen(true);
  }
  function handleEdit(event: React.MouseEvent<HTMLButtonElement>) {
    setEditTarget(findEntry(event));
    setSheetOpen(true);
  }
  function handleAskDelete(event: React.MouseEvent<HTMLButtonElement>) {
    setDeleteTarget(findEntry(event));
  }
  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (!open) setEditTarget(null);
  }
  function handleDeleteOpenChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }
  function handleDelete() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Play removed");
        setDeleteTarget(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }
  function handleRetry() {
    void playbook.refetch();
  }

  return (
    <PageWrapper
      title="Sales playbook"
      subtitle="Talk tracks, objection answers and steps the team sells by."
      state={pageState}
      onRetry={handleRetry}
      loading={LOADING}
      empty={
        <EmptyState
          title="The playbook is empty"
          description="Add the plays your team should run: discovery questions, objection answers, closing steps."
          action={canManage ? { label: "New play", onClick: handleCreate } : undefined}
          className={CONTENT_FILL_PANEL}
        />
      }
      actions={
        canManage ? (
          <AnimatedIconButton icon={PlusIcon} iconSize={16} iconClassName="mr-1.5" size="sm" onClick={handleCreate}>
            New play
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        {groups.map(([category, plays]) => (
          <section key={category} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">{category}</h2>
            {plays.map((entry) => (
              <Card key={entry.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-semibold">{entry.title}</CardTitle>
                  {canManage ? (
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" variant="outline" size="sm" data-entry-id={entry.id} onClick={handleEdit}>
                        Edit
                      </Button>
                      <Button type="button" variant="ghost" size="sm" data-entry-id={entry.id} onClick={handleAskDelete}>
                        Remove
                      </Button>
                    </div>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{entry.content || "No guidance written yet."}</p>
                </CardContent>
              </Card>
            ))}
          </section>
        ))}
      </div>

      {canManage ? <PlaybookEntrySheet open={sheetOpen} onOpenChange={handleSheetOpenChange} entry={editTarget} /> : null}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Remove this play?"
        description={deleteTarget ? `"${deleteTarget.title}" is removed from the playbook for everyone. This cannot be undone.` : ""}
        confirmLabel="Remove play"
        destructive
        isPending={remove.isPending}
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
