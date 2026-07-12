import { Badge } from "@/components/ui/badge";
import type { SignEnvelopeStatus } from "@/types/sign";
import { ENVELOPE_STATUS_LABEL, ENVELOPE_STATUS_VARIANT } from "../lib/status";

export function EnvelopeStatusBadge({ status }: { status: SignEnvelopeStatus }) {
  return <Badge variant={ENVELOPE_STATUS_VARIANT[status]}>{ENVELOPE_STATUS_LABEL[status]}</Badge>;
}
