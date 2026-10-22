import type { OutboundClass } from "@/types/crm/autonomy";

export const OUTBOUND_CLASS_LABELS: Readonly<Record<OutboundClass, string>> = {
  follow_up: "Follow-up",
  nudge: "Nudge",
  check_in: "Check-in",
  meeting_request: "Meeting request",
  cold_outreach: "Cold outreach",
};

export const OUTBOUND_REFUSAL_STAGES: Readonly<
  Record<"eligibility" | "draft" | "confidence", string>
> = {
  eligibility: "deciding whether to write at all",
  draft: "writing the message",
  confidence: "checking the message was good enough to send",
};
