"use client";

import { use, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
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
import { ViewCard } from "@/features/build/views/saved-views/view-card";
import { CreateViewSheet } from "@/features/build/views/saved-views/create-view-sheet";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PmStaggerList,
  PM_FILL_PANEL,
} from "@/features/build/shared/pm-chrome";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE } from "@/features/build/shared/text-overflow";

export default function ViewsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const { data: views, isLoading } = useViews(projectId);
  const togglePinMutation = useUpdateView();
  const deleteMutation = useDeleteView();

  const handleNavigateToView = useCallback(
    (view: { id: number; layoutType: string }) => {
      const urlParams = new URLSearchParams();
      urlParams.set("viewId", view.id.toString());
      urlParams.set("view", view.layoutType);
      router.push(`/build/${projectId}?${urlParams.toString()}`);
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
      <PageWrapper title="Views">
        <PmPageShell>
          <div className="flex flex-1 min-h-0 flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </PmPageShell>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Views"
      subtitle="Saved filters and layouts for this project"
      actions={
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" /> New View
        </Button>
      }
    >
      <PmPageShell>
        {!views?.length ? (
          <EmptyState
              className={PM_FILL_PANEL}
              illustration={<EmptySearchIllustration />}
              title="No saved views"
              description="Create custom views with saved filters and layouts."
              action={{ label: "Create First View", onClick: handleOpenCreate }}
            />
        ) : (
          <div className="flex flex-1 min-h-0 flex-col gap-4">
            {pinnedViews.length > 0 ? (
              <PmSection index={0}>
                <h2 className={`mb-2 px-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${TEXT_ONE_LINE}`}>
                  Pinned
                </h2>
                <PmPanel className="space-y-0.5 p-1.5" solid>
                  <PmStaggerList>
                    {pinnedViews.map((view) => (
                      <ViewCard
                        key={view.id}
                        view={view}
                        isPinned
                        currentUserId={currentUserId}
                        onNavigate={handleNavigateToView}
                        onTogglePin={handleTogglePin}
                        onDelete={handleDelete}
                      />
                    ))}
                  </PmStaggerList>
                </PmPanel>
              </PmSection>
            ) : null}
            {unpinnedViews.length > 0 ? (
              <PmSection index={1}>
                {pinnedViews.length > 0 ? (
                  <h2 className={`mb-2 px-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${TEXT_ONE_LINE}`}>
                    All Views
                  </h2>
                ) : null}
                <PmPanel className="space-y-0.5 p-1.5" solid>
                  <PmStaggerList>
                    {unpinnedViews.map((view) => (
                      <ViewCard
                        key={view.id}
                        view={view}
                        isPinned={false}
                        currentUserId={currentUserId}
                        onNavigate={handleNavigateToView}
                        onTogglePin={handleTogglePin}
                        onDelete={handleDelete}
                      />
                    ))}
                  </PmStaggerList>
                </PmPanel>
              </PmSection>
            ) : null}
          </div>
        )}
      </PmPageShell>

      <CreateViewSheet
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </PageWrapper>
  );
}
