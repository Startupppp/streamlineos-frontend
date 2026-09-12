"use client";

import { useState } from "react";
import { endOfDay, format, parseISO } from "date-fns";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useExtendSignEnvelopeExpiration } from "@/hooks/api/sign/envelopes";
import type { SignEnvelope, SignEnvelopeStatus } from "@/types/sign";

/**
 * Extending only reaches something while an envelope is still out with its
 * recipients, or has lapsed and can be revived — `extendExpiration` rewrites
 * `tokenExpiresAt` on every incomplete recipient, of which a draft has none and
 * a completed or voided envelope has none left that matter.
 */
const EXTENDABLE_STATUSES: ReadonlySet<SignEnvelopeStatus> = new Set([
  "sent",
  "delivered",
  "partially_completed",
  "expired",
  "correction_required",
  "declined",
  "failed",
]);

function notExtendableReason(status: SignEnvelopeStatus): string {
  if (status === "draft" || status === "ready_to_send")
    return "The expiry is set on the envelope itself until it is sent.";
  if (status === "voided") return "A voided envelope cannot be reopened.";
  return "A completed envelope has no signing window left to extend.";
}

function expiryLabel(expiresAt: string | null): string {
  if (!expiresAt) return "No expiry";
  const parsed = parseISO(expiresAt);
  return Number.isNaN(parsed.getTime()) ? "No expiry" : `Expires ${format(parsed, "d MMM yyyy")}`;
}

function initialPickerValue(expiresAt: string | null): string {
  if (!expiresAt) return "";
  const parsed = parseISO(expiresAt);
  return Number.isNaN(parsed.getTime()) ? "" : format(parsed, "yyyy-MM-dd");
}

export function EnvelopeExpiryControl({ envelope }: { envelope: SignEnvelope }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(() => initialPickerValue(envelope.expiresAt));
  const canExtend = useCan("sign:envelope:correct");
  const extend = useExtendSignEnvelopeExpiration(envelope.id);

  const label = expiryLabel(envelope.expiresAt);
  const extendable = EXTENDABLE_STATUSES.has(envelope.status);

  if (!canExtend) {
    if (!envelope.expiresAt) return null;
    return <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">{label}</span>;
  }

  if (!extendable) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            {envelope.expiresAt ? label : "Expiry not extendable"}
          </span>
        </TooltipTrigger>
        <TooltipContent>{notExtendableReason(envelope.status)}</TooltipContent>
      </Tooltip>
    );
  }

  function handleExtend() {
    if (!value) return;
    extend.mutate(
      { expiresAt: endOfDay(parseISO(value)).toISOString() },
      {
        onSuccess: () => {
          toast.success("Expiry extended");
          setOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <ResponsivePopover open={open} onOpenChange={setOpen}>
      <ResponsivePopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs tabular-nums">
          <CalendarClock className="size-3.5" />
          {label}
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent align="start" title="Extend expiry" className="w-72 space-y-3 p-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Extend expiry</p>
          <p className="text-xs text-muted-foreground">
            {envelope.status === "expired"
              ? "Reopens this envelope for signing and reissues a signing window to everyone who has not finished."
              : "Everyone who has not finished gets the new deadline; completed signatures are untouched."}
          </p>
        </div>
        <DatePicker
          value={value}
          onChange={setValue}
          disablePast
          placeholder="Pick a new expiry date"
          id={`envelope-${envelope.id}-expiry`}
        />
        <LoadingButton
          size="sm"
          className="w-full"
          isPending={extend.isPending}
          loadingText="Extending…"
          disabled={!value}
          onClick={handleExtend}
        >
          Extend expiry
        </LoadingButton>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
