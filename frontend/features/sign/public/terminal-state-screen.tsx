import { AlertTriangle, CheckCircle2, Clock, Ban, XCircle, Hourglass } from "lucide-react";
import type { SignPublicSessionState } from "@/types/sign";

const STATE_COPY: Record<Exclude<SignPublicSessionState, "active">, { icon: typeof AlertTriangle; title: string; description: string }> = {
  not_your_turn: {
    icon: Hourglass,
    title: "Not your turn yet",
    description: "This document is waiting on another signer first. We'll email you when it's your turn.",
  },
  expired: {
    icon: Clock,
    title: "This link has expired",
    description: "For your security, signing links expire. Ask the sender to resend your invitation.",
  },
  revoked: {
    icon: Ban,
    title: "This link is no longer valid",
    description: "This signing link has been revoked. Contact the sender if you believe this is a mistake.",
  },
  recipient_completed: {
    icon: CheckCircle2,
    title: "You've already signed",
    description: "You've already completed this document. No further action is needed.",
  },
  recipient_declined: {
    icon: XCircle,
    title: "You declined this document",
    description: "You previously declined to sign this document.",
  },
  envelope_voided: {
    icon: Ban,
    title: "This request has been voided",
    description: "The sender has voided this signing request. No action is needed.",
  },
  envelope_expired: {
    icon: Clock,
    title: "This request has expired",
    description: "This signing request has expired and can no longer be signed.",
  },
  envelope_declined: {
    icon: XCircle,
    title: "This request was declined",
    description: "Another recipient declined to sign, so this request is no longer active.",
  },
  envelope_completed: {
    icon: CheckCircle2,
    title: "This document is fully signed",
    description: "All parties have completed signing. Check your email for the final copy.",
  },
};

export function TerminalStateScreen({ state, envelopeTitle }: { state: SignPublicSessionState; envelopeTitle?: string }) {
  if (state === "active") return null;
  const copy = STATE_COPY[state] ?? {
    icon: AlertTriangle,
    title: "This link isn't available right now",
    description: "Please refresh, or contact the sender if this continues.",
  };
  const Icon = copy.icon;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-background">
      <div className="rounded-full bg-muted p-4">
        <Icon className="size-8 text-muted-foreground" />
      </div>
      <div className="max-w-sm space-y-1.5">
        <h1 className="text-lg font-semibold text-foreground">{copy.title}</h1>
        {envelopeTitle && <p className="text-sm font-medium text-muted-foreground">{envelopeTitle}</p>}
        <p className="text-sm text-muted-foreground">{copy.description}</p>
      </div>
    </div>
  );
}
