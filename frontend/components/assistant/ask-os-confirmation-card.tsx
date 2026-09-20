"use client";

import { useEffect, useState } from "react";
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

type LiveProps = {
  mode: "live";
  summary: string;
  preview: Record<string, unknown>;
  token: string;
  expiresAt?: string;
  title?: string;
  confirmLabel?: string;
  onConfirmed: (result: Record<string, unknown>) => void;
  onCancelled: () => void;
};

type RecordProps = {
  mode: "record";
  summary: string;
  preview: Record<string, unknown>;
  title?: string;
};

type ConfirmationCardProps = LiveProps | RecordProps;

function previewLabel(key: string): string {
  const mapped = PREVIEW_LABELS[key];
  if (mapped) return mapped;
  const spaced = key.replace(/([A-Z])/g, " $1").replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
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

function msUntilExpiry(expiresAt: string | undefined): number | null {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt).getTime();
  if (isNaN(expiry)) return null;
  return expiry - Date.now();
}

function ConfirmationRecord({ summary, preview, title }: RecordProps) {
  const cardTitle = title ?? summary;
  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium leading-5 text-foreground">{cardTitle}</p>
      <PreviewFields preview={preview} />
      <p className="text-[11px] text-muted-foreground">Past proposal — view only.</p>
    </div>
  );
}

function ConfirmationLive({
  summary,
  preview,
  token,
  expiresAt,
  title,
  confirmLabel,
  onConfirmed,
  onCancelled,
}: LiveProps) {
  const { mutate, isPending } = useConfirmAction();
  const cardTitle = title ?? summary;
  const buttonLabel = confirmLabel ?? "Confirm";
  const [expired, setExpired] = useState(() => (msUntilExpiry(expiresAt) ?? 1) <= 0);

  useEffect(() => {
    const remaining = msUntilExpiry(expiresAt);
    if (remaining === null || remaining <= 0) return;
    const id = setTimeout(() => setExpired(true), remaining);
    return () => clearTimeout(id);
  }, [expiresAt]);

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

export function AskOsConfirmationCard(props: ConfirmationCardProps) {
  if (props.mode === "record") return <ConfirmationRecord {...props} />;
  return <ConfirmationLive {...props} />;
}
