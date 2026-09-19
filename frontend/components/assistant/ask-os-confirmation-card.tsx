"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useConfirmAction } from "@/hooks/api/ai-confirm-action";

const ACTION_TITLES: Record<string, string> = {
  "email.send": "Send email",
  "mail.send": "Send email",
  "mail.reply": "Reply to email",
  "chat.postChannel": "Post to channel",
  "hr.grantRecognition": "Send kudos",
  "hr.grantBonus": "Grant bonus",
  "crm.createLead": "Create lead",
  "crm.logActivity": "Log activity",
  "ticket.assign": "Assign ticket",
  "ticket.moveToSprint": "Move to sprint",
  "calendar.createEvent": "Create event",
  "ticket.create": "Create ticket",
  "ticket.updateStatus": "Update status",
  "ticket.addComment": "Add comment",
  "calendar.createReminder": "Set reminder",
  "self.applyLeave": "Request leave",
  "self.submitExpense": "Submit expense",
  "self.logTimesheet": "Log time",
  "self.submitReferral": "Submit referral",
};

const CONFIRM_LABELS: Record<string, string> = {
  "email.send": "Send",
  "mail.send": "Send",
  "mail.reply": "Reply",
  "chat.postChannel": "Post",
  "hr.grantRecognition": "Send",
  "hr.grantBonus": "Grant",
  "crm.createLead": "Create",
  "crm.logActivity": "Log",
  "ticket.assign": "Assign",
  "ticket.moveToSprint": "Move",
  "calendar.createEvent": "Create",
  "ticket.create": "Create",
  "ticket.updateStatus": "Update",
  "ticket.addComment": "Comment",
  "calendar.createReminder": "Remind",
  "self.applyLeave": "Submit",
  "self.submitExpense": "Submit",
  "self.logTimesheet": "Log",
  "self.submitReferral": "Submit",
};

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

export function AskOsConfirmationCard({
  action,
  summary,
  preview,
  token,
  onConfirmed,
  onCancelled,
}: ConfirmationCardProps) {
  const { mutate, isPending } = useConfirmAction();
  const title = ACTION_TITLES[action] ?? summary;
  const confirmLabel = CONFIRM_LABELS[action] ?? "Confirm";

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
      <p className="text-[13px] font-medium leading-5 text-foreground">{title}</p>
      <PreviewFields preview={preview} />
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={onCancelled}
          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Discard
        </Button>
        <LoadingButton
          type="button"
          size="sm"
          isPending={isPending}
          onClick={handleConfirm}
          className="h-7 px-2.5 text-xs"
        >
          {confirmLabel}
        </LoadingButton>
      </div>
    </div>
  );
}
