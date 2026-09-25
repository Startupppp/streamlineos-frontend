import { Clock, MailCheck, MailX, ShieldOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * HRMS-E2E-018. The delivery states the server can actually observe.
 *
 * Mirrors `INVITE_DELIVERY_STATUSES` in
 * `src/modules/hr/directory/employee-invite-delivery.ts`, and the sibling test
 * fails if the two lists ever diverge.
 *
 * There is no `delivered` and no `bounced`. The provider bounce webhook is keyed
 * on the address, platform-wide, with no message id joining it back to an outbox
 * row, so neither can be attributed to a particular invite. This screen exists
 * because it once asserted "Invitation sent" over an outbox row that only meant
 * "accepted for sending"; it does not get to make that mistake in a new vocabulary.
 */
export type InviteDeliveryStatus =
  | "none"
  | "queued"
  | "sent"
  | "failed"
  | "suppressed";

export interface InviteDelivery {
  status: InviteDeliveryStatus;
  queuedAt: string | null;
  sentAt: string | null;
  attempts: number;
  lastError: string | null;
  deliveryConfirmed: false;
}

interface Presentation {
  label: string | null;
  note: string;
  icon: LucideIcon | null;
  className: string;
}

const INVITE_DELIVERY_PRESENTATION: Record<InviteDeliveryStatus, Presentation> = {
  none: {
    label: null,
    note: "",
    icon: null,
    className: "",
  },
  queued: {
    label: "Invite queued",
    note: "Written to the outbox. Not yet handed to the email provider.",
    icon: Clock,
    className:
      "bg-muted text-muted-foreground border-border",
  },
  sent: {
    label: "Invite sent",
    // Deliberately not "delivered". SENT is the provider's API accepting the
    // message and nothing more, and the note says so rather than letting the
    // word carry a promise the server never made.
    note: "Accepted by the email provider. Delivery to the inbox is not confirmed.",
    icon: MailCheck,
    className:
      "bg-status-info-surface text-status-info-ink border-status-info-rule",
  },
  failed: {
    label: "Invite failed",
    note: "The email was not handed over. Copy the invite link instead.",
    icon: MailX,
    className:
      "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  },
  suppressed: {
    label: "Invite withheld",
    note: "This address is on the suppression list after a bounce or unsubscribe, so nothing was sent. Copy the invite link instead.",
    icon: ShieldOff,
    className:
      "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  },
} as const;

export function InviteDeliveryBadge({
  delivery,
  className,
}: {
  delivery: InviteDelivery;
  className?: string;
}) {
  const presentation = INVITE_DELIVERY_PRESENTATION[delivery.status];
  const Icon = presentation.icon;
  // "none" renders nothing: an employee with no invite row has no delivery
  // status, and an empty badge would read as one.
  if (!presentation.label || !Icon) return null;

  const detail = [
    presentation.note,
    delivery.lastError,
    delivery.attempts > 1 ? `${delivery.attempts} attempts.` : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");

  return (
    <span
      title={detail}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-micro font-semibold",
        presentation.className,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {presentation.label}
    </span>
  );
}

/**
 * The line under the action buttons. Unlike the badge it always says something
 * once an invite exists, because an administrator deciding whether to hand over
 * a link needs to be told that "sent" stops at the provider.
 */
export function InviteDeliveryNote({ delivery }: { delivery: InviteDelivery }) {
  const presentation = INVITE_DELIVERY_PRESENTATION[delivery.status];
  if (!presentation.label) return null;

  return (
    <p className="text-dense leading-relaxed text-muted-foreground">
      {presentation.note}
      {delivery.lastError ? ` ${delivery.lastError}` : ""}
    </p>
  );
}

export { INVITE_DELIVERY_PRESENTATION };
