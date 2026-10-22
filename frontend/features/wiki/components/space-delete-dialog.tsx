"use client";

import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDeleteKbSpace, useKbSpaceArchiveImpact } from "@/hooks/api/kb/spaces";
import { getErrorMessage } from "@/lib/get-error-message";

interface SpaceDeleteDialogProps {
  space: { id: number; name: string } | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

function pagesSentence(pageCount: number | undefined): string {
  if (pageCount === undefined) return "Its files will move to Trash";
  return `${pageCount} ${pageCount === 1 ? "file" : "files"} will move to Trash`;
}

export function SpaceDeleteDialog({ space, onOpenChange, onDeleted }: SpaceDeleteDialogProps) {
  const deleteSpace = useDeleteKbSpace();
  const impact = useKbSpaceArchiveImpact(space?.id ?? 0, { enabled: space !== null });

  function handleConfirm() {
    if (!space) return;
    deleteSpace.mutate(space.id, {
      onSuccess: () => {
        toast.success(`Deleted "${space.name}". Its files are in Trash.`);
        onOpenChange(false);
        onDeleted?.();
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  const description = space
    ? `${pagesSentence(impact.data?.pageCount)}. They can be restored from Trash to the Docs root until Trash retention removes them. "${space.name}" itself is deleted and cannot be restored.`
    : "";

  return (
    <ConfirmDialog
      open={space !== null}
      onOpenChange={onOpenChange}
      title="Delete team folder permanently?"
      description={description}
      confirmLabel="Delete permanently"
      destructive
      keepOpenOnConfirm
      isPending={deleteSpace.isPending}
      confirmDisabled={impact.isLoading || impact.isError}
      onConfirm={handleConfirm}
    />
  );
}
