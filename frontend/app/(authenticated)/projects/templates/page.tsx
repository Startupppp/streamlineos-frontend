"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
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
  PM_PANEL,
} from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

function TemplatesGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
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
        eyebrow="Projects"
        subtitle="Reusable project structures to bootstrap new work"
        actions={
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="mr-1 h-3.5 w-3.5" /> New Template
          </Button>
        }
      >
        <PmPageShell>
          <PmSection index={0}>
            {isLoading ? (
              <TemplatesGridSkeleton />
            ) : isError ? (
              <PmPanel className="flex min-h-[14rem] items-center justify-center p-6">
                <ErrorState onRetry={handleRetry} className="flex-1" />
              </PmPanel>
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
              <PmPanel className="flex min-h-[14rem] items-center justify-center p-6">
                <EmptyState
                  illustration={<EmptyProjectsIllustration className="h-32 w-32" />}
                  title="No templates yet"
                  description="Create a reusable project structure to bootstrap new projects quickly."
                  action={{ label: "Create your first template", onClick: handleOpenCreate }}
                  className="min-h-[12rem]"
                />
              </PmPanel>
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
