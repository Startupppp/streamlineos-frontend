"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { isApiError, lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { calendarBookingQueryKeys } from "@/lib/query-keys/calendar-booking";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useBookingScope } from "./booking-rules";
import type { BookingPaymentPolicy, BookingPaymentPolicyInput, BookingPaymentSagaPage } from "./booking-payments-schema";
import type { PublicCalendarBookingPayment } from "@/hooks/api/calendar-booking-public-schema";

const policyContract = lazyContract(() => import("./booking-payments-schema").then((module) => module.bookingPaymentPolicyContract));
const sagaListContract = lazyContract(() => import("./booking-payments-schema").then((module) => module.bookingPaymentSagaListContract));
const sagaContract = lazyContract(() => import("@/hooks/api/calendar-booking-public-schema").then((module) => module.publicCalendarBookingPaymentContract));

export function useCalendarBookingPaymentPolicy(ruleId: number) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.paymentPolicy(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead, ruleId),
    queryFn: async ({ signal }): Promise<BookingPaymentPolicy | null> => {
      try {
        return await apiClient.get<BookingPaymentPolicy>(`/calendar/booking-rules/${ruleId}/payment-policy`, undefined, signal, policyContract);
      } catch (error) {
        if (isApiError(error) && error.status === 404) return null;
        throw error;
      }
    },
    enabled: Boolean(scope.orgId && scope.userId),
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}

export function useCalendarBookingPayments(ruleId: number, cursor: string | null) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.payments(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead, ruleId, cursor),
    queryFn: ({ signal }) => apiClient.get<BookingPaymentSagaPage>(`/calendar/booking-rules/${ruleId}/payments`, cursor ? { cursor } : undefined, signal, sagaListContract),
    enabled: Boolean(scope.orgId && scope.userId),
    staleTime: 15_000,
    ...INLINE_READ_ERROR,
  });
}

export function useSaveCalendarBookingPaymentPolicy(ruleId: number) {
  const queryClient = useQueryClient();
  const scope = useBookingScope();
  return useAuthorizedMutation("calendar:write", {
    mutationKey: calendarBookingQueryKeys.mutation("payment-policy"),
    mutationFn: (input: BookingPaymentPolicyInput) => apiClient.put<BookingPaymentPolicy>(`/calendar/booking-rules/${ruleId}/payment-policy`, input, undefined, policyContract),
    onSuccess: (value) => queryClient.setQueryData(calendarBookingQueryKeys.paymentPolicy(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead, ruleId), value),
  });
}

export function useReconcileCalendarBookingPayment(ruleId: number, cursor: string | null) {
  const queryClient = useQueryClient();
  const scope = useBookingScope();
  return useAuthorizedMutation("calendar:write", {
    mutationKey: calendarBookingQueryKeys.mutation("reconcile-payment"),
    mutationFn: (sagaId: string) => apiClient.post<PublicCalendarBookingPayment>(`/calendar/booking-payments/${encodeURIComponent(sagaId)}/reconcile`, undefined, undefined, sagaContract),
    onSuccess: (value) => queryClient.setQueryData<BookingPaymentSagaPage>(calendarBookingQueryKeys.payments(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead, ruleId, cursor), (current) => current ? { ...current, items: current.items.map((item) => item.sagaId === value.sagaId ? {
      sagaId: value.sagaId,
      bookingId: value.bookingId,
      providerKey: value.providerKey,
      providerOrderId: value.providerOrderId,
      amountMinor: value.amountMinor,
      currency: value.currency,
      paymentState: value.paymentState,
      bookingState: value.bookingState,
      repairState: value.repairState,
      refundedAmountMinor: value.refundedAmountMinor,
      chargebackAmountMinor: value.chargebackAmountMinor,
      version: value.version,
    } : item) } : current),
  });
}
