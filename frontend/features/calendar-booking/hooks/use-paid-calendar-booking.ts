"use client";

import { useRef, useState } from "react";
import { loadCheckoutScript, openCheckout } from "@/features/billing/lib/checkout-script";
import {
  useConfirmPublicCalendarBookingPayment,
  usePreparePublicCalendarBookingPayment,
} from "@/hooks/api/calendar-booking-public";
import type {
  PublicCalendarBookingHold,
  PublicCalendarBookingOffering,
  PublicCalendarBookingPayment,
  PublicCalendarBookingSession,
} from "@/hooks/api/calendar-booking-public-schema";
import { getErrorMessage } from "@/lib/get-error-message";

interface PaidBookingValues {
  guestName: string;
  guestEmail: string;
  intake: Record<string, string>;
  consentAccepted: boolean;
  website: string;
}

function paymentIdempotencyKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function usePaidCalendarBooking(
  token: string,
  offering: PublicCalendarBookingOffering,
  session: PublicCalendarBookingSession,
) {
  const prepare = usePreparePublicCalendarBookingPayment(token);
  const confirm = useConfirmPublicCalendarBookingPayment(token);
  const prepareKeys = useRef(new Map<string, string>());
  const [flowError, setFlowError] = useState<string | null>(null);

  async function submit(hold: PublicCalendarBookingHold, values: PaidBookingValues) {
    setFlowError(null);
    let key = prepareKeys.current.get(hold.id);
    if (!key) {
      key = paymentIdempotencyKey();
      prepareKeys.current.set(hold.id, key);
    }
    let payment: PublicCalendarBookingPayment;
    try {
      payment = await prepare.mutateAsync({
        holdId: hold.id,
        sessionToken: session.sessionToken,
        idempotencyKey: key,
        expectedFencingToken: hold.fencingToken,
        expectedRuleVersion: offering.version,
        consentAccepted: values.consentAccepted,
        honeypot: values.website,
      });
    } catch {
      return;
    }
    if (
      payment.paymentState !== "order_created" ||
      !payment.providerOrderId ||
      !payment.publicKeyId
    ) {
      setFlowError("Payment setup needs review. You have not been charged or booked.");
      return;
    }
    const publicKeyId = payment.publicKeyId;
    const providerOrderId = payment.providerOrderId;
    try {
      await loadCheckoutScript();
      const checkout = await new Promise<{ paymentId: string; signature: string }>((resolve, reject) => {
        openCheckout({
          key: publicKeyId,
          orderId: providerOrderId,
          amount: payment.amountMinor,
          currency: payment.currency,
          name: session.branding.displayName ?? offering.title,
          description: offering.description ?? undefined,
          prefillEmail: values.guestEmail,
          onSuccess: (response) => resolve({
            paymentId: response.paymentId,
            signature: response.signature,
          }),
          onDismiss: () => reject(new Error("Payment was not completed")),
        });
      });
      await confirm.mutateAsync({
        sagaId: payment.sagaId,
        sessionToken: session.sessionToken,
        paymentId: checkout.paymentId,
        signature: checkout.signature,
        expectedFencingToken: hold.fencingToken,
        expectedRuleVersion: offering.version,
        guestName: values.guestName,
        guestEmail: values.guestEmail,
        intake: values.intake,
        consentAccepted: values.consentAccepted,
        honeypot: values.website,
      });
    } catch (error) {
      setFlowError(getErrorMessage(error) || "Payment could not be completed.");
    }
  }

  return {
    result: confirm.data,
    pending: prepare.isPending || confirm.isPending,
    error: prepare.error ?? confirm.error,
    flowError,
    submit,
  };
}
