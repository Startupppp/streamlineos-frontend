"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { TruncatedText } from "@/components/ui/truncated-text";
import { useDeleteKbPageTemplate } from "@/hooks/api/kb";
import { KbTrash2Icon } from "@/features/wiki/lib/kb-icons";
import type { KbPageTemplate } from "@/hooks/api/kb/page-templates";
import type { StarterTemplate } from "@/features/wiki/lib/starter-templates";

interface TemplateCardProps {
  template: KbPageTemplate;
  canDelete: boolean;
  onUse: (templateId: number) => void;
  isPending: boolean;
  isDisabled: boolean;
}

export function TemplateCard({
  template,
  canDelete,
  onUse,
  isPending,
  isDisabled,
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
            isPending={isPending}
            disabled={isDisabled}
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
  isPending: boolean;
  isDisabled: boolean;
}

export function StarterTemplateCard({
  template,
  onUse,
  isPending,
  isDisabled,
}: StarterCardProps) {
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
        isPending={isPending}
        disabled={isDisabled}
        className="text-xs shrink-0"
      >
        Use
      </LoadingButton>
    </div>
  );
}
