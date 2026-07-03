"use client";

import { Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useKbPagesTrash, useRestoreKbPage, useHardDeleteKbPage } from "@/hooks/api/kb";
import type { KbPage } from "@/hooks/api/kb/pages";

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h ago`;
  return "recently";
}

interface TrashItemProps {
  page: KbPage;
}

function TrashItem({ page }: TrashItemProps) {
  const restorePage = useRestoreKbPage();
  const hardDelete = useHardDeleteKbPage();

  function handleRestore() {
    restorePage.mutate(page.id, {
      onSuccess: () => toast.success("Page restored"),
      onError: () => toast.error("Failed to restore page"),
    });
  }

  function handleDelete() {
    if (!window.confirm("Permanently delete this page? This cannot be undone.")) return;
    hardDelete.mutate(page.id, {
      onSuccess: () => toast.success("Page permanently deleted"),
      onError: () => toast.error("Failed to delete page"),
    });
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
      <span className="text-base shrink-0">{page.icon ?? "📄"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{page.title || "Untitled"}</p>
        <p className="text-xs text-muted-foreground">
          Deleted {page.deletedAt ? formatRelativeTime(page.deletedAt) : ""}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRestore}
          disabled={restorePage.isPending}
          className="h-7 text-xs gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          Restore
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          disabled={hardDelete.isPending}
          className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
          Delete forever
        </Button>
      </div>
    </div>
  );
}

interface TrashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TrashDialog({ open, onOpenChange }: TrashDialogProps) {
  const { data: trashedPages = [], isLoading } = useKbPagesTrash();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Trash
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-80">
          {isLoading && (
            <div className="space-y-2 p-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          )}
          {!isLoading && trashedPages.length === 0 && (
            <EmptyState
              illustration={<Trash2 className="h-8 w-8 text-muted-foreground/40" />}
              title="Trash is empty"
              description="Deleted pages will appear here."
              compact
              className="min-h-[160px]"
            />
          )}
          <div className="space-y-2 p-1">
            {trashedPages.map((page) => (
              <TrashItem key={page.id} page={page} />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
