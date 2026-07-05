"use client";

import { use, useState, useCallback } from "react";
import { useViews, useUpdateView, useDeleteView } from "@/hooks/api/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { EmptySearchIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ViewCard } from "@/features/projects/views/saved-views/view-card";
import { CreateViewSheet } from "@/features/projects/views/saved-views/create-view-sheet";
import type { ViewItem } from "@/features/projects/views/saved-views/view-card";

export default function ViewsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();

  const { data: views, isLoading } = useViews(projectId);
  const togglePinMutation = useUpdateView();
  const deleteMutation = useDeleteView();

  const handleNavigateToView = useCallback(
    (view: { id: number; layoutType: string }) => {
      const urlParams = new URLSearchParams();
      urlParams.set("viewId", view.id.toString());
      urlParams.set("view", view.layoutType);
      router.push(`/projects/${projectId}?${urlParams.toString()}`);
    },
    [router, projectId],
  );

  const handleTogglePin = useCallback(
    (viewId: number, isPinned: boolean) => {
      togglePinMutation.mutate(
        { id: viewId, projectId, isPinned },
        { onError: (err) => toast.error(getErrorMessage(err)) },
      );
    },
    [togglePinMutation, projectId],
  );

  const handleDelete = useCallback(
    (viewId: number) => {
      deleteMutation.mutate(
        { id: viewId, projectId },
        {
          onSuccess: () => toast.success("View deleted"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [deleteMutation, projectId],
  );

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCreated = useCallback(() => {}, []);

  const pinnedViews = (views ?? []).filter((v) => v.isPinned);
  const unpinnedViews = (views ?? []).filter((v) => !v.isPinned);

  if (isLoading) {
    return (
      <PageWrapper title="Views" backHref={`/projects/${projectIdStr}`}>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Views"
      backHref={`/projects/${projectIdStr}`}
      actions={
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" /> New View
        </Button>
      }
    >
      <div className="space-y-6">
        {!views?.length ? (
          <EmptyState
            illustration={<EmptySearchIllustration />}
            title="No saved views"
            description="Create custom views with saved filters and layouts."
            action={{ label: "Create First View", onClick: handleOpenCreate }}
            className="min-h-[40vh]"
          />
        ) : (
          <>
            {pinnedViews.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
                  Pinned
                </h2>
                <div>
                  {pinnedViews.map((view) => (
                    <ViewCard
                      key={view.id}
                      view={view as ViewItem}
                      isPinned
                      onNavigate={handleNavigateToView}
                      onTogglePin={handleTogglePin}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            )}
            {unpinnedViews.length > 0 && (
              <section>
                {pinnedViews.length > 0 && (
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
                    All Views
                  </h2>
                )}
                <div>
                  {unpinnedViews.map((view) => (
                    <ViewCard
                      key={view.id}
                      view={view as ViewItem}
                      isPinned={false}
                      onNavigate={handleNavigateToView}
                      onTogglePin={handleTogglePin}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <CreateViewSheet
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </PageWrapper>
  );
}
