import type { OutboundClass } from "@/types/crm/autonomy";

/** `OUTBOUND_CLASS_LABELS` in `outbound-classes.ts`; the class is read, never sent. */
export const OUTBOUND_CLASS_LABELS: Readonly<Record<OutboundClass, string>> = {
  follow_up: "Follow-up",
  nudge: "Nudge",
  check_in: "Check-in",
  meeting_request: "Meeting request",
  cold_outreach: "Cold outreach",
};

/**
 * Which gate stopped it, in words.
 *
 * The distinction is the point: eligibility means the system decided it should
 * not write to this person, while draft and confidence mean it tried and would
 * not stand behind what it produced. Collapsing the three into "refused" would
 * lose the only signal an operator has for whether to intervene themselves.
 */
export const OUTBOUND_REFUSAL_STAGES: Readonly<
  Record<"eligibility" | "draft" | "confidence", string>
> = {
  eligibility: "deciding whether to write at all",
  draft: "writing the message",
  confidence: "checking the message was good enough to send",
};
