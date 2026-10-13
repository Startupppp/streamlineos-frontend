import { z } from "zod";

const intakeFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "email", "phone", "textarea", "select"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export const publicCalendarBookingOfferingContract = z.object({
  title: z.string(),
  description: z.string().nullable(),
  durationMinutes: z.number().int(),
  timeZone: z.string(),
  version: z.number().int().positive(),
  intakeFields: z.array(intakeFieldSchema),
  cancellationNoticeMinutes: z.number().int().nonnegative(),
  rescheduleNoticeMinutes: z.number().int().nonnegative(),
  requiresApproval: z.boolean(),
  availabilityState: z.enum(["available", "no_slots", "uncertain"]),
  message: z.string(),
  slots: z.array(z.object({
    start: z.string(),
    end: z.string(),
    localStart: z.string(),
    localEnd: z.string(),
  })),
});

const brandingContract = z.object({
  displayName: z.string().nullable(),
  logoUrl: z.string().nullable(),
  primaryColor: z.string().nullable(),
  showPoweredBy: z.boolean(),
});

export const publicCalendarBookingSessionContract = z.object({
  sessionToken: z.string(),
  channel: z.enum(["page", "embed"]),
  targetOrigin: z.string().nullable(),
  callbackSignature: z.string().nullable(),
  locale: z.string(),
  branding: brandingContract,
  copy: z.object({
    locale: z.string(),
    title: z.string().nullable(),
    description: z.string().nullable(),
    consentLabel: z.string().nullable(),
    fieldLabels: z.record(z.string(), z.string()),
  }),
  callbackFacts: z.array(z.enum(["outcome", "bookingId", "start", "end"])),
  intakeKeys: z.array(z.string()),
  consentRequired: z.boolean(),
  distributionVersion: z.number().int().positive().nullable(),
  payment: z.object({
    amountMinor: z.number().int().positive(),
    currency: z.string().length(3),
  }).nullable(),
});

export const publicCalendarBookingHoldContract = z.object({
  id: z.string().uuid(),
  status: z.enum(["held", "reserved", "released", "expired", "cancelled"]),
  startAt: z.string(),
  endAt: z.string(),
  fencingToken: z.number().int().positive(),
  expiresAt: z.string(),
});

export const publicCalendarBookingReceiptContract = z.object({
  id: z.string().uuid(),
  bookingId: z.string().uuid().nullable(),
  outcome: z.enum(["confirmed", "rejected", "expired", "cancelled", "pending", "uncertain"]),
  reasonCode: z.string().nullable(),
  startAt: z.string(),
  endAt: z.string(),
  providerSyncStatus: z.enum(["not_requested", "pending", "synced", "failed", "uncertain"]),
  externalEffectsStatus: z.enum(["not_requested", "pending", "succeeded", "failed", "uncertain"]),
  availability: z.object({
    evaluatedAt: z.string().nullable(),
    asOf: z.string().nullable(),
    coverage: z.string().nullable(),
  }),
  alternatives: z.array(z.object({ start: z.string(), end: z.string() })),
});

export const publicCalendarBookingCallbackContract = z.object({
  type: z.literal("streamline.calendar.booking.completed"),
  signature: z.string(),
  facts: z.object({
    outcome: z.enum(["confirmed", "pending"]).optional(),
    bookingId: z.string().uuid().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
  }),
});

export const publicCalendarBookingPaymentContract = z.object({
  sagaId: z.string().uuid(),
  bookingId: z.string().uuid().nullable(),
  providerKey: z.string(),
  publicKeyId: z.string().nullable(),
  providerOrderId: z.string().nullable(),
  amountMinor: z.number().int().positive(),
  currency: z.string().length(3),
  paymentState: z.enum(["order_pending", "order_unknown", "order_created", "authorized", "captured", "failed", "partially_refunded", "refunded", "charged_back"]),
  bookingState: z.enum(["pending", "confirmed", "failed", "cancelled"]),
  repairState: z.enum(["none", "reconcile_order", "reconcile_payment", "refund_required", "refund_pending", "refund_failed", "manual_review", "resolved"]),
  refundedAmountMinor: z.number().int().nonnegative(),
  chargebackAmountMinor: z.number().int().nonnegative(),
  version: z.number().int().positive(),
  receipt: publicCalendarBookingReceiptContract.nullable(),
});

export type PublicCalendarBookingOffering = z.infer<typeof publicCalendarBookingOfferingContract>;
export type PublicCalendarBookingSession = z.infer<typeof publicCalendarBookingSessionContract>;
export type PublicCalendarBookingHold = z.infer<typeof publicCalendarBookingHoldContract>;
export type PublicCalendarBookingReceipt = z.infer<typeof publicCalendarBookingReceiptContract>;
export type PublicCalendarBookingCallback = z.infer<typeof publicCalendarBookingCallbackContract>;
export type PublicCalendarBookingPayment = z.infer<typeof publicCalendarBookingPaymentContract>;
