"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useDeleteKbPageTemplate } from "@/hooks/api/kb";
import { KbTrash2Icon, KbPencilIcon } from "@/features/wiki/lib/kb-icons";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import type { KbPageTemplate } from "@/hooks/api/kb/page-templates";
import type { StarterTemplate } from "@/features/wiki/lib/starter-templates";
import { EditTemplateDialog } from "./edit-template-dialog";
import { SavedTemplatePreviewDialog } from "./template-preview-dialog";

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
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  function handleUseClick() {
    onUse(template.id);
  }

  function handleDeleteClick() {
    setConfirmOpen(true);
  }

  function handleEditClick() {
    setEditOpen(true);
  }

  function handlePreviewClick() {
    setPreviewOpen(true);
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

  function handleEditOpenChange(open: boolean) {
    setEditOpen(open);
  }

  function handlePreviewOpenChange(open: boolean) {
    setPreviewOpen(open);
  }

  return (
    <>
      <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
        <span className="text-xl shrink-0 mt-0.5">{template.icon ?? (template.kind === "spreadsheet" ? "📊" : "📄")}</span>
        <div className="flex-1 min-w-0">
          <TruncatedText text={template.name} className="text-label font-medium" />
          {template.kind === "spreadsheet" && (
            <span className="inline-block text-xs text-muted-foreground bg-muted rounded px-1 py-0.5 mt-0.5">Spreadsheet</span>
          )}
          {template.description && (
            <TruncatedText text={template.description} lines={2} className="text-xs text-muted-foreground mt-0.5" />
          )}
          {template.createdByName && (
            <span className="mt-1 block text-xs text-muted-foreground">
              By {template.createdByName}
            </span>
          )}
          <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
            {template.useCount === 0
              ? "Never used"
              : `${template.useCount} use${template.useCount === 1 ? "" : "s"}${
                  template.lastUsedAt
                    ? ` · Last used ${kbTimeAgo(template.lastUsedAt)}`
                    : ""
                }`}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handlePreviewClick}
            className="text-xs"
            aria-label={`Preview ${template.name}`}
          >
            Preview
          </Button>
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
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleEditClick}
              className="w-7 p-0 text-muted-foreground hover:text-foreground"
              aria-label="Edit template"
            >
              <KbPencilIcon className="h-3.5 w-3.5" />
            </Button>
          )}
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

      {editOpen && (
        <EditTemplateDialog template={template} onOpenChange={handleEditOpenChange} />
      )}

      {previewOpen && (
        <SavedTemplatePreviewDialog template={template} onOpenChange={handlePreviewOpenChange} />
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={handleConfirmOpenChange}
        title="Delete template?"
        description={`“${template.name}” will be permanently deleted and cannot be recovered.`}
        destructive
        confirmLabel="Delete"
        isPending={deleteTemplate.isPending}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

interface StarterCardProps {
  template: StarterTemplate;
  onUse: (template: StarterTemplate) => void;
  onPreview: (template: StarterTemplate) => void;
  isPending: boolean;
  isDisabled: boolean;
}

export function StarterTemplateCard({
  template,
  onUse,
  onPreview,
  isPending,
  isDisabled,
}: StarterCardProps) {
  function handleUseClick() {
    onUse(template);
  }

  function handlePreviewClick() {
    onPreview(template);
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
      <span className="text-xl shrink-0 mt-0.5">{template.icon}</span>
      <button
        type="button"
        onClick={handlePreviewClick}
        className="flex-1 min-w-0 text-left"
        aria-label={`Preview ${template.name}`}
      >
        <TruncatedText text={template.name} className="text-label font-medium" />
        <TruncatedText text={template.description} lines={2} className="text-xs text-muted-foreground mt-0.5" />
      </button>
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
