"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDeleteSignRecipient } from "@/hooks/api/sign/recipients";
import type { SignRecipient } from "@/types/sign";
import { useBuilder } from "./builder-context";
import { recipientColor } from "./recipient-colors";
import { AddRecipientDialog } from "./add-recipient-dialog";

interface RecipientsPanelProps {
  envelopeId: number;
  recipients: SignRecipient[];
  editable: boolean;
}

export function RecipientsPanel({ envelopeId, recipients, editable }: RecipientsPanelProps) {
  const [addOpen, setAddOpen] = useState(false);
  const { selectedRecipientId, setSelectedRecipientId } = useBuilder();
  const deleteRecipient = useDeleteSignRecipient(envelopeId);

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await deleteRecipient.mutateAsync(id);
      if (selectedRecipientId === id) setSelectedRecipientId(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const nextRoutingOrder = recipients.length > 0 ? Math.max(...recipients.map((r) => r.routingOrder)) + 1 : 1;

  return (
    <div className="space-y-2">
      {recipients.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No recipients yet.</p>
      ) : (
        recipients.map((recipient, idx) => {
          const color = recipientColor(idx);
          const isSelected = selectedRecipientId === recipient.id;
          return (
            <div
              key={recipient.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedRecipientId(recipient.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSelectedRecipientId(recipient.id);
              }}
              className={`w-full flex items-center gap-2 rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
                isSelected ? "border-foreground bg-muted" : "border-border hover:bg-muted/50"
              }`}
            >
              <span className={`size-2.5 rounded-full shrink-0 ${color.solid}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{recipient.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {recipient.roleName} · order {recipient.routingOrder}
                </p>
              </div>
              {editable && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={(e) => handleDelete(recipient.id, e)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          );
        })
      )}
      {editable && (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add recipient
        </Button>
      )}
      <AddRecipientDialog envelopeId={envelopeId} open={addOpen} onOpenChange={setAddOpen} nextRoutingOrder={nextRoutingOrder} />
    </div>
  );
}
