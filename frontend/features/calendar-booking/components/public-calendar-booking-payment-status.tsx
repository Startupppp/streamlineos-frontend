import { ShieldCheck } from "lucide-react";
import type { PublicCalendarBookingPayment } from "@/hooks/api/calendar-booking-public-schema";
import { publicBookingCopy } from "../lib/public-booking-copy";

export function PublicCalendarBookingPaymentStatus({
  payment,
  locale,
}: {
  payment: PublicCalendarBookingPayment;
  locale: string;
}) {
  const copy = publicBookingCopy(locale);
  return (
    <div className="space-y-4 py-12 text-center" aria-live="polite">
      <ShieldCheck className="mx-auto size-10 text-warning" aria-hidden="true" />
      <h2 className="text-xl font-semibold text-foreground">{copy.paymentAttention}</h2>
      <p className="text-sm text-muted-foreground">
        {copy.payment}: {payment.paymentState.replaceAll("_", " ")} · {copy.booking}: {payment.bookingState}
      </p>
      <p className="text-sm text-muted-foreground">
        {copy.paymentRepair(payment.repairState.replaceAll("_", " "))}
      </p>
    </div>
  );
}
