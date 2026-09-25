"use client";

import { useState, useCallback } from "react";
import { Eye, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { SanitizedHtml } from "@/components/shared/sanitized-html";
import { cn } from "@/lib/utils";
import type { DocumentTemplate } from "@/hooks/api/hr/document-templates";

export function VariableChips({ variables }: { variables: string[] }) {
  const visible = variables.slice(0, 3);
  const rest = variables.length - 3;
  if (!variables.length) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((v) => (
        <span
          key={v}
          className="inline-flex items-center px-1.5 py-0.5 rounded-md text-micro font-mono bg-muted text-foreground border border-border"
        >
          {`{{${v}}}`}
        </span>
      ))}
      {rest > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-micro bg-muted text-muted-foreground border border-border/50">
          +{rest}
        </span>
      )}
    </div>
  );
}

export function PreviewDialog({ template }: { template: DocumentTemplate }) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback((e: Event) => {
    e.preventDefault();
    setOpen(true);
  }, []);

  const handleOpenChange = useCallback((val: boolean) => setOpen(val), []);

  return (
    <>
      <DropdownMenuItem onSelect={handleSelect}>
        <Eye className="mr-2 h-3.5 w-3.5" />
        Preview
      </DropdownMenuItem>

      {open && (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
          <AlertDialogContent className="max-w-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-semibold">
                Preview — {template.title}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Raw HTML preview with variable tokens shown as-is.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <SanitizedHtml
              html={template.htmlContent}
              className="max-h-[60dvh] overflow-y-auto rounded-xl border bg-card p-4 text-sm prose prose-sm dark:prose-invert max-w-none"
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

export function DeleteConfirm({
  template,
  onDelete,
  isPending,
}: {
  template: DocumentTemplate;
  onDelete: (templateId: number) => void;
  isPending: boolean;
}) {
  const handleDelete = useCallback(
    () => onDelete(template.id),
    [template.id, onDelete],
  );
  const handleSelectPrevent = useCallback((e: Event) => e.preventDefault(), []);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem variant="destructive"
          onSelect={handleSelectPrevent}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete template?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{template.title}&rdquo; will be permanently deleted. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DefaultStarButtonProps {
  template: DocumentTemplate;
  currentDefault: DocumentTemplate | undefined;
  onSetDefault: (templateId: number, isDefault: boolean) => void;
  isPending: boolean;
}

export function DefaultStarButton({
  template,
  currentDefault,
  onSetDefault,
  isPending,
}: DefaultStarButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isCurrentDefault = template.isDefault;
  const hasExistingDefault = !!currentDefault && !isCurrentDefault;

  const handleClick = useCallback(() => setConfirmOpen(true), []);
  const handleConfirmOpenChange = useCallback(
    (val: boolean) => setConfirmOpen(val),
    [],
  );
  const handleConfirm = useCallback(() => {
    onSetDefault(template.id, !isCurrentDefault);
    setConfirmOpen(false);
  }, [template.id, isCurrentDefault, onSetDefault]);

  const confirmTitle = isCurrentDefault
    ? "Remove default status?"
    : "Set as default template?";

  const confirmDescription = isCurrentDefault
    ? "Are you sure you want to remove the default status from this template?"
    : hasExistingDefault
      ? `This will replace "${currentDefault.title}" as the default template. Continue?`
      : "Set this template as the default?";

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 shrink-0 transition-colors duration-200",
          isCurrentDefault
            ? "text-status-warning-ink hover:text-status-warning-ink"
            : "text-muted-foreground hover:text-status-warning-ink",
        )}
        onClick={handleClick}
        disabled={isPending}
        aria-label={
          isCurrentDefault ? "Remove default status" : "Set as default"
        }
        title={isCurrentDefault ? "Remove default status" : "Set as default"}
      >
        <Star className={cn("h-4 w-4", isCurrentDefault && "fill-status-warning-fill")} />
      </Button>

      <ConfirmSheet
        open={confirmOpen}
        onOpenChange={handleConfirmOpenChange}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel="Confirm"
        isPending={isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
