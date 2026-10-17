import { z } from "zod";
import { publicCalendarBookingPaymentContract } from "@/hooks/api/calendar-booking-public-schema";

export const bookingPaymentPolicyInputSchema = z.object({
  expectedVersion: z.number().int().positive().nullable(),
  status: z.enum(["active", "disabled"]),
  providerKey: z.string().trim().min(1).max(60),
  environment: z.enum(["test", "live"]),
  amountMinor: z.number().int().positive().max(1_000_000_000),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  refundableUntilMinutesBeforeStart: z.number().int().nonnegative().max(525_600),
  lateCancellationRefundPercent: z.number().int().min(0).max(100),
});

export const bookingPaymentPolicyContract = z.object({
  ruleId: z.number().int().positive(),
  version: z.number().int().positive(),
  status: z.enum(["active", "disabled"]),
  providerKey: z.string(),
  environment: z.enum(["test", "live"]),
  amountMinor: z.number().int().positive(),
  currency: z.string().length(3),
  refundableUntilMinutesBeforeStart: z.number().int().nonnegative(),
  lateCancellationRefundPercent: z.number().int().min(0).max(100),
  createdAt: z.string(),
});

export const bookingPaymentSagaListContract = z.object({
  items: z.array(publicCalendarBookingPaymentContract.omit({ publicKeyId: true, receipt: true })),
  nextCursor: z.string().nullable(),
});

export type BookingPaymentPolicyInput = z.infer<typeof bookingPaymentPolicyInputSchema>;
export type BookingPaymentPolicy = z.infer<typeof bookingPaymentPolicyContract>;
export type BookingPaymentSaga = z.infer<typeof bookingPaymentSagaListContract>["items"][number];
export type BookingPaymentSagaPage = z.infer<typeof bookingPaymentSagaListContract>;
