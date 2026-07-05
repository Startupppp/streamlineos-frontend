import { cn } from "@/lib/utils";
import type { PaymentProviderStatus } from "@/hooks/api/payments";
import { PROVIDER_STATUS_LABELS, PROVIDER_STATUS_TONE, STATUS_TONE_CLASSNAMES } from "../lib/status";

export function ProviderStatusBadge({ status, className }: { status: PaymentProviderStatus; className?: string }) {
  const tone = PROVIDER_STATUS_TONE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        STATUS_TONE_CLASSNAMES[tone],
        className,
      )}
    >
      {PROVIDER_STATUS_LABELS[status]}
    </span>
  );
}
