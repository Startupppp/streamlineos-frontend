"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage, getErrorStatus } from "@/lib/get-error-message";
import {
  useConfirmAction,
  useDeclineProposal,
  type ConfirmActionResult,
} from "@/hooks/api/ai-confirm-action";
import { AskOsReceiptCard } from "./ask-os-answer-card";
import type { AskOsActionReceipt, AskOsDirectiveOf } from "./ask-os-directive-schema";

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
  onConfirmed: (outcome: ConfirmActionResult) => void;
  onCancelled: () => void;
  cancelPending?: boolean;
};

type RecordProps = {
  mode: "record";
  summary: string;
  preview: Record<string, unknown>;
  title?: string;
};

type ReceiptProps = {
  mode: "receipt";
  title: string;
  receipt: AskOsActionReceipt;
};

type ConfirmationCardProps = LiveProps | RecordProps | ReceiptProps;

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
          <dt className="pt-px text-dense font-medium text-muted-foreground">{previewLabel(key)}</dt>
          <dd className="min-w-0 break-words text-label leading-5 text-foreground">{String(value)}</dd>
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

export function useAskOsExpired(expiresAt: string | undefined): boolean {
  const [expired, setExpired] = useState(() => (msUntilExpiry(expiresAt) ?? 1) <= 0);

  useEffect(() => {
    const remaining = msUntilExpiry(expiresAt);
    if (remaining === null || remaining <= 0) return;
    const id = setTimeout(() => setExpired(true), remaining);
    return () => clearTimeout(id);
  }, [expiresAt]);

  return expired;
}

function ConfirmationReceipt({ title, receipt }: ReceiptProps) {
  return (
    <div className="space-y-2">
      <p className="text-label font-medium leading-5 text-foreground">{title}</p>
      <AskOsReceiptCard receipt={receipt} />
    </div>
  );
}

function ConfirmationRecord({ summary, preview, title }: RecordProps) {
  const cardTitle = title ?? summary;
  return (
    <div className="space-y-2">
      <p className="text-label font-medium leading-5 text-foreground">{cardTitle}</p>
      <PreviewFields preview={preview} />
      <p className="text-dense text-muted-foreground">Past proposal — view only.</p>
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
  cancelPending,
}: LiveProps) {
  const { mutate, isPending } = useConfirmAction();
  const cardTitle = title ?? summary;
  const buttonLabel = confirmLabel ?? "Confirm";
  const expired = useAskOsExpired(expiresAt);

  function handleConfirm() {
    mutate(token, {
      onSuccess: (data) => {
        onConfirmed(data);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-label font-medium leading-5 text-foreground">{cardTitle}</p>
      {expired ? (
        <p className="text-dense text-muted-foreground">This action has expired.</p>
      ) : (
        <PreviewFields preview={preview} />
      )}
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending || cancelPending || expired}
          onClick={onCancelled}
          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {cancelPending ? "Discarding…" : "Discard"}
        </Button>
        <LoadingButton
          type="button"
          size="sm"
          isPending={isPending}
          disabled={expired || cancelPending}
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
  if (props.mode === "receipt") return <ConfirmationReceipt {...props} />;
  return <ConfirmationLive {...props} />;
}

function confirmOutcomeFallback(action: string): string {
  if (action === "email.send" || action === "mail.send") return "Email sent.";
  return "Done.";
}

function confirmOutcomeCopy(outcome: ConfirmActionResult, action: string): string {
  const summary = typeof outcome.summary === "string" ? outcome.summary.trim() : "";
  if (summary) return summary;
  return confirmOutcomeFallback(action);
}

export function ConfirmDirectiveSlot({
  directive,
  persisted,
}: {
  directive: AskOsDirectiveOf<"confirm-action">;
  persisted: boolean;
}) {
  const [confirmedOutcome, setConfirmedOutcome] =
    useState<ConfirmActionResult | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const decline = useDeclineProposal();

  function handleConfirmed(outcome: ConfirmActionResult) {
    setConfirmedOutcome(outcome);
  }

  function handleCancelled() {
    decline.mutate(directive.proposalId, {
      onSuccess: () => {
        setCancelled(true);
      },
      onError: (error) => {
        const status = getErrorStatus(error);
        if (status === 404 || status === 409) {
          setCancelled(true);
          return;
        }
        toast.error(getErrorMessage(error));
      },
    });
  }

  const { token } = directive;

  if (persisted || token === undefined)
    return (
      <AskOsConfirmationCard
        mode="record"
        summary={directive.summary}
        preview={directive.preview}
        title={directive.title}
      />
    );

  if (confirmedOutcome?.receipt)
    return (
      <AskOsConfirmationCard
        mode="receipt"
        title={directive.title ?? directive.summary}
        receipt={confirmedOutcome.receipt}
      />
    );
  if (confirmedOutcome !== null)
    return (
      <p className="text-label text-muted-foreground">
        {confirmOutcomeCopy(confirmedOutcome, directive.action)}
      </p>
    );
  if (cancelled)
    return <p className="text-label text-muted-foreground">Cancelled.</p>;

  return (
    <AskOsConfirmationCard
      mode="live"
      summary={directive.summary}
      preview={directive.preview}
      token={token}
      expiresAt={directive.expiresAt}
      title={directive.title}
      confirmLabel={directive.confirmLabel}
      onConfirmed={handleConfirmed}
      onCancelled={handleCancelled}
      cancelPending={decline.isPending}
    />
  );
}
