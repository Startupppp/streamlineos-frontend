import { z } from "zod";

/**
 * Platform billing: the plan an organization is on, what it may spend, what it
 * has already paid and how many seats it has left. Every screen that decides
 * "you cannot do this, upgrade" reads from one of these bodies.
 *
 * Three shapes are not what the hand-written types said:
 *   · `subscription_status` is a Postgres enum with SIX values — `SUSPENDED`
 *     was missing from the client union, so a suspended tenant fell through
 *     every `switch` on status.
 *   · `payments[].amount` is a `numeric(15,2)` selected raw, so it is a STRING
 *     and it is nullable. The paise twin `amountPaise` is the integer.
 *   · `billing_profiles.country` has a DB default but is not NOT NULL, and the
 *     update DTO accepts an explicit null, so it can arrive as `null`.
 *
 * Not `.strict()`: an added plan feature or profile column is a backward
 * compatible deploy. A dropped or retyped one is the drift this catches.
 */

export const subscriptionPlanContract = z.enum([
  "STARTER",
  "PROFESSIONAL",
  "ENTERPRISE",
]);

export const subscriptionStatusContract = z.enum([
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
  "SUSPENDED",
  "EXPIRED",
]);

export const subscriptionPaymentContract = z.object({
  id: z.number(),
  orgId: z.string(),
  subscriptionId: z.number(),
  razorpayPaymentId: z.string().nullable(),
  razorpayOrderId: z.string().nullable(),
  amount: z.string().nullable(),
  amountPaise: z.number(),
  currency: z.string(),
  status: z.string(),
  paidAt: z.string().nullable(),
  createdAt: z.string(),
});

export const subscriptionContract = z.object({
  id: z.number(),
  orgId: z.string(),
  plan: subscriptionPlanContract,
  status: subscriptionStatusContract,
  razorpaySubscriptionId: z.string().nullable(),
  razorpayCustomerId: z.string().nullable(),
  razorpayPlanId: z.string().nullable(),
  currentPeriodStart: z.string().nullable(),
  currentPeriodEnd: z.string().nullable(),
  trialEndsAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  payments: z.array(subscriptionPaymentContract),
});

export const billingReadinessContract = z.object({
  configured: z.boolean(),
  providerKey: z.string().nullable(),
  environment: z.enum(["test", "live"]).nullable(),
  publicKeyId: z.string().nullable(),
  webhookConfigured: z.boolean(),
  unavailableReason: z
    .enum(["no_credentials", "incomplete_credentials", "unsupported_provider"])
    .nullable(),
});

export const subscriptionResponseContract = z.object({
  subscription: subscriptionContract.nullable(),
  publicKeyId: z.string().nullable(),
  isConfigured: z.boolean(),
  platformCheckout: billingReadinessContract,
});

export const planDefinitionContract = z.object({
  id: subscriptionPlanContract,
  name: z.string(),
  monthlyPrice: z.number(),
  annualPrice: z.number(),
  monthlyPricePaise: z.number(),
  annualTotalPaise: z.number(),
  features: z.array(z.string()),
  maxEmployees: z.number().nullable(),
});

export const billingPlansContract = z.object({
  plans: z.array(planDefinitionContract),
  trialPlan: subscriptionPlanContract,
});

export const billingProfileContract = z.object({
  id: z.number(),
  orgId: z.string(),
  gstin: z.string().nullable(),
  pan: z.string().nullable(),
  billingName: z.string().nullable(),
  billingEmail: z.string().nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  pincode: z.string().nullable(),
  country: z.string().nullable(),
  isTaxExempt: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const seatInfoContract = z.object({
  total: z.number().nullable(),
  used: z.number(),
  available: z.number().nullable(),
  activeMembers: z.number(),
  pendingInvitations: z.number(),
});

export const couponValidationContract = z.object({
  valid: z.boolean(),
  couponId: z.number().nullable(),
  type: z.enum(["PERCENTAGE", "FIXED"]).nullable(),
  value: z.number().nullable(),
  discountAmount: z.number().nullable(),
  message: z.string(),
});

export const createOrderContract = z.object({
  orderId: z.string(),
  amount: z.number(),
  currency: z.string(),
  keyId: z.string().nullable(),
  environment: z.enum(["test", "live"]).nullable(),
  plan: subscriptionPlanContract,
  billingCycle: z.enum(["monthly", "annual"]),
  discountAmount: z.number(),
  purchaseId: z.number(),
  expiresAt: z.string(),
});

export const verifySubscriptionRequestContract = z.object({
  orderId: z.string(),
  paymentId: z.string(),
  signature: z.string(),
});

export const verifySubscriptionContract = z.object({
  success: z.literal(true),
  plan: subscriptionPlanContract,
  billingCycle: z.enum(["monthly", "annual"]),
  status: z.string(),
  currentPeriodEnd: z.string().nullable(),
  alreadyActivated: z.boolean(),
});

export type SubscriptionPlan = z.infer<typeof subscriptionPlanContract>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusContract>;
export type SubscriptionPayment = z.infer<typeof subscriptionPaymentContract>;
export type Subscription = z.infer<typeof subscriptionContract>;
export type SubscriptionResponse = z.infer<typeof subscriptionResponseContract>;
export type BillingReadiness = z.infer<typeof billingReadinessContract>;
export type PlanDefinition = z.infer<typeof planDefinitionContract>;
export type BillingPlansResponse = z.infer<typeof billingPlansContract>;
export type BillingProfile = z.infer<typeof billingProfileContract>;
export type SeatInfo = z.infer<typeof seatInfoContract>;
export type CouponValidationResult = z.infer<typeof couponValidationContract>;
export type CreateOrderResult = z.infer<typeof createOrderContract>;
export type VerifySubscriptionRequest = z.infer<typeof verifySubscriptionRequestContract>;
export type VerifySubscriptionResult = z.infer<typeof verifySubscriptionContract>;
