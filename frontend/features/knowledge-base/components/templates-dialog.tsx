"use client";

import { useState } from "react";
import { LayoutTemplate, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useKbPageTemplates, useDeleteKbPageTemplate } from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import type { KbPageTemplate } from "@/hooks/api/kb/page-templates";

interface TemplateCardProps {
  template: KbPageTemplate;
  canDelete: boolean;
  onUse: (id: number) => void;
}

function TemplateCard({ template, canDelete, onUse }: TemplateCardProps) {
  const deleteTemplate = useDeleteKbPageTemplate();
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

  function handleUse() {
    onUse(template.id);
  }

  function handleDelete() {
    setDeleteAlertOpen(true);
  }

  function handleConfirmDelete() {
    deleteTemplate.mutate(template.id, {
      onSuccess: () => toast.success("Template deleted"),
      onError: () => toast.error("Failed to delete template"),
    });
  }

  function handleDeleteAlertOpenChange(open: boolean) {
    setDeleteAlertOpen(open);
  }

  return (
    <>
      <div className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
        <span className="text-2xl shrink-0">{template.icon ?? "📄"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{template.name}</p>
          {template.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {template.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" onClick={handleUse} className="h-7 text-xs">
            Use
          </Button>
          {canDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleteTemplate.isPending}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            >
              {deleteTemplate.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={deleteAlertOpen} onOpenChange={handleDeleteAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{template.name}&rdquo; will be permanently deleted and cannot be recovered.
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

interface TemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseTemplate?: (templateId: number) => void;
}

export default function TemplatesDialog({
  open,
  onOpenChange,
  onUseTemplate,
}: TemplatesDialogProps) {
  const { data: templates = [], isLoading } = useKbPageTemplates();
  const canDelete = useCan("kb:templates:manage");

  function handleUse(templateId: number) {
    onUseTemplate?.(templateId);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4" />
            Templates
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-96">
          {isLoading && (
            <div className="space-y-3 p-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          )}
          {!isLoading && templates.length === 0 && (
            <EmptyState
              illustration={<LayoutTemplate className="h-8 w-8 text-muted-foreground/40" />}
              title="No templates yet"
              description="Save a page as a template to see it here."
              compact
              className="min-h-[160px]"
            />
          )}
          <div className="space-y-2 p-1">
            {templates.map((t) => (
              <TemplateCard key={t.id} template={t} canDelete={canDelete} onUse={handleUse} />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
