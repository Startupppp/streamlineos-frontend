"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  publicCalendarBookingCallbackContract,
  publicCalendarBookingHoldContract,
  publicCalendarBookingOfferingContract,
  publicCalendarBookingPaymentContract,
  publicCalendarBookingReceiptContract,
  publicCalendarBookingSessionContract,
  type PublicCalendarBookingCallback,
  type PublicCalendarBookingHold,
  type PublicCalendarBookingOffering,
  type PublicCalendarBookingPayment,
  type PublicCalendarBookingReceipt,
  type PublicCalendarBookingSession,
} from "./calendar-booking-public-schema";

interface CalendarBookingAttributionInput {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  referrerDomain: string | null;
}

interface CreateCalendarBookingSessionInput {
  locale?: string;
  callbackState: string | null;
  consentAccepted: boolean;
  honeypot: string;
  attribution: CalendarBookingAttributionInput;
}

interface CreateCalendarBookingHoldInput {
  start: string;
  sessionToken: string;
  idempotencyKey: string;
  consentAccepted: boolean;
  honeypot: string;
}

interface ConfirmCalendarBookingInput {
  holdId: string;
  sessionToken: string;
  idempotencyKey: string;
  expectedFencingToken: number;
  expectedRuleVersion: number;
  guestName: string;
  guestEmail: string;
  intake: Record<string, string>;
  consentAccepted: boolean;
  honeypot: string;
}

interface PrepareCalendarBookingPaymentInput {
  holdId: string;
  sessionToken: string;
  idempotencyKey: string;
  expectedFencingToken: number;
  expectedRuleVersion: number;
  consentAccepted: boolean;
  honeypot: string;
}

interface ConfirmCalendarBookingPaymentInput {
  sagaId: string;
  sessionToken: string;
  paymentId: string;
  signature: string;
  expectedFencingToken: number;
  expectedRuleVersion: number;
  guestName: string;
  guestEmail: string;
  intake: Record<string, string>;
  consentAccepted: boolean;
  honeypot: string;
}

function basePath(token: string) {
  return `/public/calendar/booking/${encodeURIComponent(token)}`;
}

export function usePublicCalendarBookingOffering(token: string, from: string, to: string) {
  return useQuery({
    queryKey: ["public", "calendar", "booking", token, "offering", from, to],
    queryFn: ({ signal }) => apiClient.get<PublicCalendarBookingOffering>(
      basePath(token),
      { from, to },
      signal,
      publicCalendarBookingOfferingContract,
    ),
    enabled: Boolean(token),
    retry: false,
    staleTime: 30_000,
  });
}

export function usePublicCalendarBookingSession(
  token: string,
  input: CreateCalendarBookingSessionInput,
) {
  return useQuery({
    queryKey: ["public", "calendar", "booking", token, "session", input],
    queryFn: () => apiClient.post<PublicCalendarBookingSession>(
      `${basePath(token)}/sessions`,
      input,
      undefined,
      publicCalendarBookingSessionContract,
    ),
    enabled: Boolean(token),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useCreatePublicCalendarBookingHold(token: string) {
  return useMutation({
    mutationKey: ["public", "calendar", "booking", token, "hold"],
    mutationFn: (input: CreateCalendarBookingHoldInput) =>
      apiClient.post<PublicCalendarBookingHold>(
        `${basePath(token)}/holds`,
        input,
        undefined,
        publicCalendarBookingHoldContract,
      ),
  });
}

export function useConfirmPublicCalendarBooking(token: string) {
  return useMutation({
    mutationKey: ["public", "calendar", "booking", token, "confirm"],
    mutationFn: (input: ConfirmCalendarBookingInput) =>
      apiClient.post<PublicCalendarBookingReceipt>(
        `${basePath(token)}/confirm`,
        input,
        undefined,
        publicCalendarBookingReceiptContract,
      ),
  });
}

export function usePreparePublicCalendarBookingPayment(token: string) {
  return useMutation({
    mutationKey: ["public", "calendar", "booking", token, "payment", "prepare"],
    mutationFn: (input: PrepareCalendarBookingPaymentInput) =>
      apiClient.post<PublicCalendarBookingPayment>(
        `${basePath(token)}/payments/prepare`,
        input,
        undefined,
        publicCalendarBookingPaymentContract,
      ),
  });
}

export function useConfirmPublicCalendarBookingPayment(token: string) {
  return useMutation({
    mutationKey: ["public", "calendar", "booking", token, "payment", "confirm"],
    mutationFn: (input: ConfirmCalendarBookingPaymentInput) =>
      apiClient.post<PublicCalendarBookingPayment>(
        `${basePath(token)}/payments/confirm`,
        input,
        undefined,
        publicCalendarBookingPaymentContract,
      ),
  });
}

export function usePublicCalendarBookingCallback(
  token: string,
  sessionToken: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["public", "calendar", "booking", token, "callback", sessionToken],
    queryFn: ({ signal }) => apiClient.get<PublicCalendarBookingCallback>(
      `${basePath(token)}/sessions/${encodeURIComponent(sessionToken ?? "")}/callback`,
      undefined,
      signal,
      publicCalendarBookingCallbackContract,
    ),
    enabled: Boolean(token && sessionToken && enabled),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
