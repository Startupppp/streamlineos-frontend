"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useConfirmAction } from "@/hooks/api/ai-confirm-action";

const PREVIEW_LABELS: Record<string, string> = {
  toEmail: "To",
  subject: "Subject",
  bodyPreview: "Body",
  body: "Body",
  channelName: "Channel",
  message: "Message",
  title: "Title",
};

interface ConfirmationCardProps {
  action: string;
  summary: string;
  preview: Record<string, unknown>;
  token: string;
  expiresAt?: string;
  title?: string;
  confirmLabel?: string;
  onConfirmed: (result: Record<string, unknown>) => void;
  onCancelled: () => void;
}

function previewLabel(key: string): string {
  const mapped = PREVIEW_LABELS[key];
  if (mapped) return mapped;
  return key.replace(/([A-Z])/g, " $1").replace(/[_-]+/g, " ").trim();
}

function PreviewFields({ preview }: { preview: Record<string, unknown> }) {
  const entries = Object.entries(preview).filter(([, value]) => value !== undefined && value !== null);
  if (entries.length === 0) return null;
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="pt-px text-[11px] font-medium text-muted-foreground">{previewLabel(key)}</dt>
          <dd className="min-w-0 break-words text-[13px] leading-5 text-foreground">{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function isExpired(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) <= new Date();
}

export function AskOsConfirmationCard({
  action: _action,
  summary,
  preview,
  token,
  expiresAt,
  title,
  confirmLabel,
  onConfirmed,
  onCancelled,
}: ConfirmationCardProps) {
  const { mutate, isPending } = useConfirmAction();
  const cardTitle = title ?? summary;
  const buttonLabel = confirmLabel ?? "Confirm";
  const expired = isExpired(expiresAt);

  function handleConfirm() {
    mutate(token, {
      onSuccess: (data) => {
        onConfirmed(data.result);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium leading-5 text-foreground">{cardTitle}</p>
      {expired ? (
        <p className="text-[11px] text-muted-foreground">This action has expired.</p>
      ) : (
        <PreviewFields preview={preview} />
      )}
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending || expired}
          onClick={onCancelled}
          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Discard
        </Button>
        <LoadingButton
          type="button"
          size="sm"
          isPending={isPending}
          disabled={expired}
          onClick={handleConfirm}
          className="h-7 px-2.5 text-xs"
        >
          {expired ? "Expired" : buttonLabel}
        </LoadingButton>
      </div>
    </div>
  );
}
