import type { SignEnvelopeStatus, SignRecipientStatus } from "@/types/sign";

export const ENVELOPE_STATUS_LABEL: Record<SignEnvelopeStatus, string> = {
  draft: "Draft",
  ready_to_send: "Ready to send",
  sent: "Sent",
  delivered: "Delivered",
  partially_completed: "Partially signed",
  completed: "Completed",
  declined: "Declined",
  voided: "Voided",
  expired: "Expired",
  correction_required: "Needs correction",
  failed: "Failed",
};

export const ENVELOPE_STATUS_VARIANT: Record<SignEnvelopeStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  ready_to_send: "outline",
  sent: "secondary",
  delivered: "secondary",
  partially_completed: "secondary",
  completed: "default",
  declined: "destructive",
  voided: "destructive",
  expired: "destructive",
  correction_required: "destructive",
  failed: "destructive",
};

export const RECIPIENT_STATUS_LABEL: Record<SignRecipientStatus, string> = {
  pending: "Pending",
  invited: "Invited",
  viewed: "Viewed",
  authenticated: "Authenticated",
  signing: "Signing",
  completed: "Completed",
  declined: "Declined",
  delegated: "Delegated",
  bounced: "Bounced",
  expired: "Expired",
};
