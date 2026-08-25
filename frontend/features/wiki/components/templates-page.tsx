"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageWrapper, PageSection } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { pageHref } from "@/features/wiki/lib/knowledge-routes";
import {
  STARTER_TEMPLATES,
  deriveContentText,
} from "@/features/wiki/lib/starter-templates";
import {
  KbLayoutTemplateIcon,
  KbTrash2Icon,
} from "@/features/wiki/lib/kb-icons";
import type { KbPageTemplate } from "@/hooks/api/kb/page-templates";
import type { StarterTemplate } from "@/features/wiki/lib/starter-templates";
import { TruncatedText } from "@/components/ui/truncated-text";

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
          <TruncatedText text={template.name} className="text-label font-medium" />
          {template.description && (
            <TruncatedText text={template.description} lines={2} className="text-xs text-muted-foreground mt-0.5" />
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <LoadingButton
            size="sm"
            onClick={handleUseClick}
            isPending={isCreating}
            className="text-xs"
          >
            Use
          </LoadingButton>
          {canDelete && (
            <LoadingButton
              size="sm"
              variant="ghost"
              onClick={handleDeleteClick}
              isPending={deleteTemplate.isPending}
              className="w-7 p-0 text-muted-foreground hover:text-destructive"
              aria-label="Delete template"
            >
              <KbTrash2Icon className="h-3.5 w-3.5" />
            </LoadingButton>
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
        <TruncatedText text={template.name} className="text-label font-medium" />
        <TruncatedText text={template.description} lines={2} className="text-xs text-muted-foreground mt-0.5" />
      </div>
      <LoadingButton
        size="sm"
        variant="outline"
        onClick={handleUseClick}
        isPending={isCreating}
        className="text-xs shrink-0"
      >
        Use
      </LoadingButton>
    </div>
  );
}

function TemplatesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg border border-border bg-card" />
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

  return (
    <PageWrapper title="Templates" subtitle="Starter skeletons and your saved page templates">
      <div className="space-y-4">
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
                <KbLayoutTemplateIcon className="w-8 text-muted-foreground/40" />
              }
              title="Could not load templates"
              description="There was a problem fetching page templates."
              className={CONTENT_FILL_PANEL}
            />
          )}

          {!isLoading && !isError && templates.length === 0 && (
            <EmptyState
              illustration={
                <KbLayoutTemplateIcon className="w-8 text-muted-foreground/40" />
              }
              title="No saved templates yet"
              description="Save a page as a template to reuse its structure across your wiki."
              className={CONTENT_FILL_PANEL}
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
