"use client";

import { AiDraftCard } from "@/components/ai/ai-draft-card";
import { useConfirmAction } from "@/hooks/api/ai-confirm-action";

interface ConfirmationCardProps {
  action: string;
  summary: string;
  preview: Record<string, unknown>;
  token: string;
  onConfirmed: (result: Record<string, unknown>) => void;
  onCancelled: () => void;
}

function PreviewTable({ preview }: { preview: Record<string, unknown> }) {
  const entries = Object.entries(preview).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return null;
  return (
    <table className="w-full text-xs">
      <tbody>
        {entries.map(([key, value]) => (
          <tr key={key} className="border-b border-border last:border-0">
            <td className="py-1 pr-3 font-medium text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</td>
            <td className="py-1 text-foreground break-all">{String(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AskOsConfirmationCard({ action, summary, preview, token, onConfirmed, onCancelled }: ConfirmationCardProps) {
  const { mutate, isPending } = useConfirmAction();

  function handleConfirm() {
    mutate(token, {
      onSuccess: (data) => {
        onConfirmed(data.result);
      },
    });
  }

  return (
    <AiDraftCard
      title={summary}
      acceptLabel="Confirm"
      isAcceptPending={isPending}
      onAccept={handleConfirm}
      onDiscard={onCancelled}
    >
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Action: {action}</p>
        <PreviewTable preview={preview} />
      </div>
    </AiDraftCard>
  );
}
