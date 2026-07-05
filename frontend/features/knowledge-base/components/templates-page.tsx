"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageWrapper, PageSection } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  useKbPageTemplates,
  useDeleteKbPageTemplate,
  useCreateKbPage,
  useUpdateKbPage,
} from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import { pageHref } from "@/features/knowledge-base/lib/knowledge-routes";
import {
  STARTER_TEMPLATES,
  deriveContentText,
} from "@/features/knowledge-base/lib/starter-templates";
import {
  KbLayoutTemplateIcon,
  KbTrash2Icon,
  KbLoader2Icon,
} from "@/features/knowledge-base/lib/kb-icons";
import type { KbPageTemplate } from "@/hooks/api/kb/page-templates";
import type { StarterTemplate } from "@/features/knowledge-base/lib/starter-templates";

interface TemplateCardProps {
  template: KbPageTemplate;
  canDelete: boolean;
  onUse: (templateId: number) => void;
  isCreating: boolean;
}

function TemplateCard({
  template,
  canDelete,
  onUse,
  isCreating,
}: TemplateCardProps) {
  const deleteTemplate = useDeleteKbPageTemplate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleUseClick() {
    onUse(template.id);
  }

  function handleDeleteClick() {
    setConfirmOpen(true);
  }

  function handleConfirmDelete() {
    deleteTemplate.mutate(template.id, {
      onSuccess: () => toast.success("Template deleted"),
      onError: () => toast.error("Failed to delete template"),
    });
  }

  function handleConfirmOpenChange(open: boolean) {
    setConfirmOpen(open);
  }

  return (
    <>
      <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
        <span className="text-xl shrink-0 mt-0.5">{template.icon ?? "📄"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium truncate">{template.name}</p>
          {template.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {template.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            onClick={handleUseClick}
            disabled={isCreating}
            className="h-7 text-xs"
          >
            {isCreating ? (
              <KbLoader2Icon className="h-3 w-3 animate-spin" />
            ) : (
              "Use"
            )}
          </Button>
          {canDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeleteClick}
              disabled={deleteTemplate.isPending}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              aria-label="Delete template"
            >
              {deleteTemplate.isPending ? (
                <KbLoader2Icon className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <KbTrash2Icon className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={handleConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{template.name}&rdquo; will be permanently deleted and
              cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={deleteTemplate.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface StarterCardProps {
  template: StarterTemplate;
  onUse: (template: StarterTemplate) => void;
  isCreating: boolean;
}

function StarterCard({ template, onUse, isCreating }: StarterCardProps) {
  function handleUseClick() {
    onUse(template);
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
      <span className="text-xl shrink-0 mt-0.5">{template.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate">{template.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {template.description}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleUseClick}
        disabled={isCreating}
        className="h-7 text-xs shrink-0"
      >
        {isCreating ? (
          <KbLoader2Icon className="h-3 w-3 animate-spin" />
        ) : (
          "Use"
        )}
      </Button>
    </div>
  );
}

function TemplatesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const { data: templates = [], isLoading, isError } = useKbPageTemplates();
  const canDelete = useCan("kb:templates:manage");
  const createPage = useCreateKbPage();
  const updatePage = useUpdateKbPage();

  const isCreating = createPage.isPending || updatePage.isPending;

  const handleUseTemplate = useCallback(
    (templateId: number) => {
      createPage.mutate(
        { templateId },
        {
          onSuccess: (page) => {
            router.push(pageHref(page.id));
          },
          onError: () => {
            toast.error("Failed to create page from template");
          },
        },
      );
    },
    [createPage, router],
  );

  const handleUseStarter = useCallback(
    (template: StarterTemplate) => {
      createPage.mutate(
        { title: template.name },
        {
          onSuccess: (page) => {
            updatePage.mutate(
              {
                pageId: page.id,
                content: template.content as Record<string, unknown>,
                contentText: deriveContentText(template.content),
              },
              {
                onSettled: () => {
                  router.push(pageHref(page.id));
                },
              },
            );
          },
          onError: () => {
            toast.error("Failed to create page from starter template");
          },
        },
      );
    },
    [createPage, updatePage, router],
  );

  const subtitle =
    templates.length > 0
      ? `${templates.length} saved template${templates.length === 1 ? "" : "s"}`
      : undefined;

  return (
    <PageWrapper title="Templates" subtitle={subtitle}>
      <div className="space-y-8">
        <PageSection
          title="Starter templates"
          description="Built-in skeletons ready to use — creates a new page with content pre-filled."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STARTER_TEMPLATES.map((t) => (
              <StarterCard
                key={t.key}
                template={t}
                onUse={handleUseStarter}
                isCreating={isCreating}
              />
            ))}
          </div>
        </PageSection>

        <PageSection
          title="Saved templates"
          description="Templates created from your wiki pages."
        >
          {isLoading && <TemplatesSkeleton />}

          {!isLoading && isError && (
            <EmptyState
              illustration={
                <KbLayoutTemplateIcon className="h-8 w-8 text-muted-foreground/40" />
              }
              title="Could not load templates"
              description="There was a problem fetching page templates."
            />
          )}

          {!isLoading && !isError && templates.length === 0 && (
            <EmptyState
              illustration={
                <KbLayoutTemplateIcon className="h-8 w-8 text-muted-foreground/40" />
              }
              title="No saved templates yet"
              description="Save a page as a template to reuse its structure across your wiki."
            />
          )}

          {!isLoading && !isError && templates.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  canDelete={canDelete}
                  onUse={handleUseTemplate}
                  isCreating={isCreating}
                />
              ))}
            </div>
          )}
        </PageSection>
      </div>
    </PageWrapper>
  );
}
