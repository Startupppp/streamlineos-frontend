"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDeleteSignRecipient } from "@/hooks/api/sign/recipients";
import type { SignRecipient } from "@/types/sign";
import { TruncatedText } from "@/components/ui/truncated-text";
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
                <TruncatedText text={recipient.name} className="text-sm font-medium" />
                <TruncatedText text={`${recipient.roleName} · order ${recipient.routingOrder}`} className="text-xs text-muted-foreground" />
              </div>
              {editable && (
                <AnimatedIconButton
                  variant="ghost"
                  size="icon"
                  icon={Trash2Icon}
                  iconSize={14}
                  className="size-7 shrink-0"
                  aria-label="Remove recipient"
                  onClick={(e) => handleDelete(recipient.id, e)}
                />
              )}
            </div>
          );
        })
      )}
      {editable && (
        <AnimatedIconButton variant="outline" size="sm" icon={PlusIcon} iconClassName="mr-1.5" className="w-full" onClick={() => setAddOpen(true)}>
          Add recipient
        </AnimatedIconButton>
      )}
      <AddRecipientDialog envelopeId={envelopeId} open={addOpen} onOpenChange={setAddOpen} nextRoutingOrder={nextRoutingOrder} />
    </div>
  );
}
