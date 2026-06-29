"use client";

import { useCallback } from "react";
import { Copy, AlertCircle, RefreshCw, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getApiError } from "@/lib/api-client";
import { useRoleTemplates, useCloneRoleTemplate, type RoleTemplate } from "@/hooks/api/roles";

interface RoleTemplateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function RoleTemplateDialog({ open, onOpenChange }: RoleTemplateDialogProps) {
  const { data: templates, isLoading, isError, error, refetch } = useRoleTemplates();
  const clone = useCloneRoleTemplate();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleClone = useCallback(
    (template: RoleTemplate) => {
      clone.mutate(
        { templateId: template.id },
        {
          onSuccess: () => {
            toast.success(`"${template.name}" role cloned`);
            onOpenChange(false);
          },
          onError: (e) => toast.error(getApiError(e)),
        },
      );
    },
    [clone, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Role Templates</DialogTitle>
          <DialogDescription>
            Clone a pre-built role to get started quickly. You can customize permissions after.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {isLoading ? (
            <TemplatesSkeleton />
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-sm font-medium">Failed to load templates</p>
                <p className="text-xs text-muted-foreground mt-0.5">{getApiError(error)}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRetry} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          ) : !templates || templates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <FileX className="h-8 w-8 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium">No templates available</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create a role from scratch and build your own permissions.
                </p>
              </div>
            </div>
          ) : (
            templates.map((t) => (
              <TemplateRow
                key={t.id}
                template={t}
                clonePending={clone.isPending}
                onClone={handleClone}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TemplatesSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

interface TemplateRowProps {
  template: RoleTemplate;
  clonePending: boolean;
  onClone: (template: RoleTemplate) => void;
}

function TemplateRow({ template, clonePending, onClone }: TemplateRowProps) {
  const handleClone = useCallback(() => onClone(template), [template, onClone]);

  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div>
        <p className="text-sm font-medium">{template.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{template.slug}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {template.permissions.length} permission{template.permissions.length !== 1 ? "s" : ""}
        </p>
      </div>
      <Button size="sm" variant="outline" disabled={clonePending} onClick={handleClone}>
        <Copy className="h-3.5 w-3.5 mr-1" /> Clone
      </Button>
    </div>
  );
}
