"use client";

import { useState, useCallback } from "react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useProjectWebhookImpact } from "@/hooks/api/build/webhooks";
import { Trash2Icon } from "@animateicons/react/lucide";

interface WebhookCardDeleteTriggerProps {
  webhookId: number;
  projectId: number;
  onDelete: (id: number) => void;
}

export function WebhookCardDeleteTrigger({
  webhookId,
  projectId,
  onDelete,
}: WebhookCardDeleteTriggerProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { data: impact } = useProjectWebhookImpact(
    projectId,
    webhookId,
    deleteOpen,
  );
  const handleConfirmDelete = useCallback(
    () => onDelete(webhookId),
    [onDelete, webhookId],
  );
  const handleOpenDelete = useCallback(() => setDeleteOpen(true), []);

  return (
    <>
      <AnimatedIconButton
        variant="ghost"
        size="icon"
        aria-label="Delete webhook"
        className="w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
        icon={Trash2Icon}
        iconSize={14}
        onClick={handleOpenDelete}
      />
      <ConfirmDialog
        title="Delete webhook?"
        description={
          impact
            ? `${impact.totalDeliveries} total deliveries on record (${impact.successfulDeliveries} successful). Deliveries will stop immediately. This cannot be undone.`
            : "Deliveries will stop immediately. This cannot be undone."
        }
        confirmLabel="Delete"
        destructive
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
