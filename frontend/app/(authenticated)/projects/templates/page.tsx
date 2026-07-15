"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
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
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RequireModule } from "@/components/auth/require-module";
import {
  useProjectTemplates,
  useDeleteProjectTemplate,
  type ProjectTemplate,
} from "@/hooks/api/projects";
import { TemplateCard } from "@/features/projects/templates/template-card";
import { CreateTemplateSheet } from "@/features/projects/templates/create-template-sheet";
import { ApplyTemplateDialog } from "@/features/projects/templates/apply-template-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PmStaggerList,
  PM_FILL_PANEL,
  PM_PANEL,
} from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

function NewTemplateButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} className="mr-1" /> New Template
    </Button>
  );
}

function TemplatesGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className={cn(PM_PANEL, "space-y-3 p-4")}>
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProjectTemplatesPage() {
  const { data: templates, isLoading, isError, refetch } = useProjectTemplates();
  const deleteTemplate = useDeleteProjectTemplate();
  const [createOpen, setCreateOpen] = useState(false);
  const [applyTarget, setApplyTarget] = useState<ProjectTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectTemplate | null>(null);

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCloseCreate = useCallback(() => setCreateOpen(false), []);
  const handleApplyTarget = useCallback((t: ProjectTemplate) => setApplyTarget(t), []);
  const handleCloseApply = useCallback(() => setApplyTarget(null), []);
  const handleDeleteTarget = useCallback((t: ProjectTemplate) => setDeleteTarget(t), []);

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteTemplate.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Template deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteTarget, deleteTemplate]);

  function handleRetry() {
    void refetch();
  }

  return (
    <RequireModule module="PROJECTS">
      <PageWrapper
        title="Templates"
        subtitle="Reusable project structures to bootstrap new work"
        actions={<NewTemplateButton onClick={handleOpenCreate} />}
      >
        <PmPageShell>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            {isLoading ? (
              <TemplatesGridSkeleton />
            ) : isError ? (
              <ErrorState className={PM_FILL_PANEL} onRetry={handleRetry} />
            ) : templates && templates.length > 0 ? (
              <PmStaggerList
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                role="list"
                aria-label="Project templates"
              >
                {templates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onApply={handleApplyTarget}
                    onDelete={handleDeleteTarget}
                  />
                ))}
              </PmStaggerList>
            ) : (
              <EmptyState
                  className={PM_FILL_PANEL}
                  illustration={<EmptyProjectsIllustration className="h-32 w-32" />}
                  title="No templates yet"
                  description="Create a reusable project structure to bootstrap new projects quickly."
                  action={{ label: "Create your first template", onClick: handleOpenCreate }}
                />
            )}
          </PmSection>
        </PmPageShell>

        <CreateTemplateSheet open={createOpen} onClose={handleCloseCreate} />

        {applyTarget ? (
          <ApplyTemplateDialog template={applyTarget} onClose={handleCloseApply} />
        ) : null}

        <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete template?</AlertDialogTitle>
              <AlertDialogDescription>
                &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted. Projects created
                from it will not be affected.
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
    </RequireModule>
  );
}
