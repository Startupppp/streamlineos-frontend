"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertCircle, RefreshCw, FileX } from "lucide-react";
import { CopyIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchInput } from "@/components/ui/search-input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRoleTemplates, useCloneRoleTemplate, type RoleTemplate } from "@/hooks/api/roles";

interface RoleTemplateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function RoleTemplateDialog({ open, onOpenChange }: RoleTemplateDialogProps) {
  const [search, setSearch] = useState("");
  const { data: templates, isLoading, isError, error, refetch } = useRoleTemplates();
  const clone = useCloneRoleTemplate();

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q),
    );
  }, [templates, search]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setSearch("");
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const handleClone = useCallback(
    (template: RoleTemplate) => {
      clone.mutate(
        { templateId: template.id },
        {
          onSuccess: () => {
            toast.success(`"${template.name}" role cloned`);
            setSearch("");
            onOpenChange(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [clone, onOpenChange],
  );

  const showSearch = !isLoading && !isError && (templates?.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Role Templates</DialogTitle>
          <DialogDescription>
            Clone a pre-built role to get started quickly. You can customize permissions after.
          </DialogDescription>
        </DialogHeader>
        {showSearch && (
          <SearchInput
            placeholder="Search templates…"
            value={search}
            onValueChange={setSearch}
            className="shrink-0"
          />
        )}
        <DialogBody className="space-y-2 py-2">
          {isLoading ? (
            <TemplatesSkeleton />
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-sm font-medium">Failed to load templates</p>
                <p className="text-xs text-muted-foreground mt-0.5">{getErrorMessage(error)}</p>
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
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <FileX className="h-8 w-8 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium">No matching templates</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Try a different name or slug.
                </p>
              </div>
            </div>
          ) : (
            filteredTemplates.map((t) => (
              <TemplateRow
                key={t.id}
                template={t}
                clonePending={clone.isPending}
                onClone={handleClone}
              />
            ))
          )}
        </DialogBody>
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
      <AnimatedIconButton icon={CopyIcon} iconSize={14} iconClassName="mr-1" size="sm" variant="outline" disabled={clonePending} onClick={handleClone}>
        Clone
      </AnimatedIconButton>
    </div>
  );
}
