import { ShieldCheck } from "lucide-react";
import type { PublicCalendarBookingPayment } from "@/hooks/api/calendar-booking-public-schema";

export function PublicCalendarBookingPaymentStatus({
  payment,
}: {
  payment: PublicCalendarBookingPayment;
}) {
  return (
    <div className="space-y-4 py-12 text-center" aria-live="polite">
      <ShieldCheck className="mx-auto size-10 text-warning" aria-hidden="true" />
      <h2 className="text-xl font-semibold text-foreground">Your payment needs attention</h2>
      <p className="text-sm text-muted-foreground">
        Payment: {payment.paymentState.replaceAll("_", " ")} · Booking: {payment.bookingState}
      </p>
      <p className="text-sm text-muted-foreground">
        This request is in {payment.repairState.replaceAll("_", " ")} and will not appear as a confirmed paid booking.
      </p>
    </div>
  );
}
