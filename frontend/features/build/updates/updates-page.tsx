"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  useProjectUpdates,
  useCreateProjectUpdate,
  useDeleteProjectUpdate,
} from "@/hooks/api/build/project-updates";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  useBuildListFilters,
  BUILD_FILTER_ALL,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { ShortcutHelpDialog } from "@/features/build/shared/shortcut-help-dialog";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { EntityFormDialog } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { Card, CardContent } from "@/components/ui/card";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ProjectUpdateRow } from "@/hooks/api/build/project-updates";
import { createUpdateSchema, type CreateUpdateInput } from "./updates-schema";
import { UpdateFormFields } from "./update-form-fields";

function NewUpdateButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} />
      Post Update
    </Button>
  );
}

function UpdateCard({
  update,
  canManage,
  onDelete,
  focused,
}: {
  update: ProjectUpdateRow;
  canManage: boolean;
  onDelete: (id: number) => void;
  focused?: boolean;
}) {
  const handleDelete = useCallback(() => onDelete(update.id), [update.id, onDelete]);
  const date = new Date(update.createdAt).toLocaleString();

  return (
    <Card className={cn(CONTENT_PANEL_SOLID, focused && "ring-2 ring-primary")}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize bg-muted text-muted-foreground">
            {update.status}
          </span>
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize bg-muted text-muted-foreground">
            {update.audience}
          </span>
          <span className="text-dense font-medium text-muted-foreground">{update.authorName}</span>
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap">{update.body}</p>
        {update.wins ? (
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Wins</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{update.wins}</p>
          </div>
        ) : null}
        {update.risks ? (
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Risks</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{update.risks}</p>
          </div>
        ) : null}
        {update.next ? (
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Next</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{update.next}</p>
          </div>
        ) : null}
        {update.citations ? (
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Citations</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{update.citations}</p>
          </div>
        ) : null}
        <div className="flex items-center justify-between pt-1">
          <span className="text-dense font-medium text-muted-foreground tabular-nums">{date}</span>
          {canManage ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={handleDelete}
              type="button"
            >
              Delete
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

const UPDATE_FILTER_DEFINITIONS = [
  { param: "authorId" },
  { param: "from" },
  { param: "to" },
  { param: "status" },
] as const;

interface UpdatesPageProps {
  projectId: number;
}

export function UpdatesPage({ projectId }: UpdatesPageProps) {
  const canManage = useCan("build:updates:manage");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const isOnline = useOnlineStatus();

  const handleOpenShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);
  const handleShortcutHelpOpenChange = useCallback((open: boolean) => setShortcutHelpOpen(open), []);

  const listFilters = useBuildListFilters({ filters: UPDATE_FILTER_DEFINITIONS, withSearch: false });
  const authorId = listFilters.value("authorId");
  const from = listFilters.value("from");
  const to = listFilters.value("to");
  const statusParam = listFilters.value("status");

  const { data, isLoading, isError, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useProjectUpdates(projectId, {
      authorId: authorId !== BUILD_FILTER_ALL ? authorId : undefined,
      from: from !== BUILD_FILTER_ALL ? from : undefined,
      to: to !== BUILD_FILTER_ALL ? to : undefined,
      status:
        statusParam !== BUILD_FILTER_ALL && (statusParam === "draft" || statusParam === "published")
          ? statusParam
          : undefined,
    });
  const createUpdate = useCreateProjectUpdate(projectId);
  const deleteUpdate = useDeleteProjectUpdate(projectId);

  const handleCreate = useCallback(
    (input: CreateUpdateInput) => {
      createUpdate.mutate(input, {
        onSuccess: () => {
          toast.success("Update posted");
          setDialogOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [createUpdate],
  );

  const handleDelete = useCallback(
    (updateId: number) => {
      deleteUpdate.mutate(updateId, {
        onSuccess: () => toast.success("Update deleted"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [deleteUpdate],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleOpenDialog = useCallback(() => setDialogOpen(true), []);

  const handleDialogOpenChange = useCallback((open: boolean) => setDialogOpen(open), []);

  const { focusedIndex } = useBuildListKeyboard({
    itemCount: data.length,
    onOpen: () => {},
    onCreate: canManage ? handleOpenDialog : undefined,
    onClearSelection: () => {},
    onShortcutHelp: handleOpenShortcutHelp,
    enabled: !dialogOpen && !shortcutHelpOpen,
  });

  const pageState = usePageState({
    permission: "build:updates:view",
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !isError && data.length === 0,
  });

  return (
    <PageWrapper
      title="Updates"
      subtitle="Project status updates and announcements"
      actions={canManage ? <NewUpdateButton onClick={handleOpenDialog} /> : undefined}
    >
      {!isOnline && (
        <p className="mb-2 rounded-md bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
          You&apos;re offline — results may not be up to date
        </p>
      )}
      <PageState
        resolution={pageState}
        loading={
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`${CONTENT_PANEL_SOLID} h-24 animate-pulse`} />
            ))}
          </div>
        }
        empty={
          <EmptyState
            className="flex-1 min-h-0"
            illustrationPreset="activity"
            title="No updates yet"
            description="Post project updates to keep your team informed on progress, blockers, and milestones."
            action={canManage ? { label: "Post Update", onClick: handleOpenDialog } : undefined}
          />
        }
        onRetry={handleRetry}
        className="flex flex-1 min-h-0 flex-col gap-4"
      >
        <div className="flex flex-col gap-3">
          {data.map((update, index) => (
            <UpdateCard
              key={update.id}
              update={update}
              canManage={canManage}
              onDelete={handleDelete}
              focused={focusedIndex === index}
            />
          ))}
        </div>
        <InfiniteScrollSentinel
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
          label="Load more updates"
        />
      </PageState>

      <EntityFormDialog<CreateUpdateInput>
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        title="Post update"
        description="Share progress, blockers, or milestones with your team."
        resolver={zodResolver(createUpdateSchema)}
        defaultValues={{ body: "" }}
        onSubmit={handleCreate}
        isSubmitting={createUpdate.isPending}
        submitLabel="Post"
      >
        {(form) => <UpdateFormFields form={form} isOpen={dialogOpen} />}
      </EntityFormDialog>

      <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={handleShortcutHelpOpenChange} />
    </PageWrapper>
  );
}
