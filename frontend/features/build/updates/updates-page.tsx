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
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { EntityFormDialog } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { Card, CardContent } from "@/components/ui/card";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectUpdateRow } from "@/hooks/api/build/project-updates";
import { createUpdateSchema, type CreateUpdateInput } from "./updates-schema";

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
}: {
  update: ProjectUpdateRow;
  canManage: boolean;
  onDelete: (id: number) => void;
}) {
  const handleDelete = useCallback(() => onDelete(update.id), [update.id, onDelete]);
  const date = new Date(update.createdAt).toLocaleString();

  return (
    <Card className={CONTENT_PANEL_SOLID}>
      <CardContent className="p-4 space-y-2">
        <p className="text-sm text-foreground whitespace-pre-wrap">{update.body}</p>
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

interface UpdatesPageProps {
  projectId: number;
}

export function UpdatesPage({ projectId }: UpdatesPageProps) {
  const canManage = useCan("build:updates:manage");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading, isError, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useProjectUpdates(projectId);
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


  const pageState = usePageState({ permission: "build:updates:view", isLoading, isError, error });

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading") {
    return (
      <PageWrapper title="Updates" subtitle="Project status updates and announcements">
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  if (pageState.kind === "loading") {
    return (
      <PageWrapper title="Updates" subtitle="Project status updates and announcements">
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${CONTENT_PANEL_SOLID} h-24 animate-pulse`} />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Updates"
      subtitle="Project status updates and announcements"
      actions={canManage ? <NewUpdateButton onClick={handleOpenDialog} /> : undefined}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {data.length === 0 ? (
          <EmptyState
            className="flex-1 min-h-0"
            illustrationPreset="activity"
            title="No updates yet"
            description="Post project updates to keep your team informed on progress, blockers, and milestones."
            action={canManage ? { label: "Post Update", onClick: handleOpenDialog } : undefined}
          />
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {data.map((update) => (
                <UpdateCard
                  key={update.id}
                  update={update}
                  canManage={canManage}
                  onDelete={handleDelete}
                />
              ))}
            </div>
            <InfiniteScrollSentinel
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={fetchNextPage}
              label="Load more updates"
            />
          </>
        )}
      </div>

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
        {(form) => (
          <Form {...form}>
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Update</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What's the latest on this project?"
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Form>
        )}
      </EntityFormDialog>
    </PageWrapper>
  );
}
