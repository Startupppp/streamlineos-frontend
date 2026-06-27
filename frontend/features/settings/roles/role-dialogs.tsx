"use client";

import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRoleTemplates, useCloneRoleTemplate, type RoleTemplate } from "@/lib/api/hooks/roles";

export function RoleTemplateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: templates, isLoading } = useRoleTemplates();
  const clone = useCloneRoleTemplate();

  function handleClone(template: RoleTemplate) {
    clone.mutate(
      { templateId: template.id },
      {
        onSuccess: () => {
          toast.success(`"${template.name}" role cloned`);
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message ?? "Failed to clone template"),
      },
    );
  }

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
            <div className="text-sm text-muted-foreground text-center py-4">Loading templates...</div>
          ) : (
            templates?.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{t.slug}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.permissions.length} permission{t.permissions.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={clone.isPending}
                  onClick={() => handleClone(t)}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" /> Clone
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
