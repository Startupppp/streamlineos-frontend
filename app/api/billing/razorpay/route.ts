import { type NextRequest, NextResponse } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { subscriptions, subscriptionPayments } from "@/lib/db/schema/shared";
import { eq, and } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";
import crypto from "crypto";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

function isRazorpayConfigured(): boolean {
  return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.orgId, session.orgId),
      with: { payments: { limit: 5, orderBy: (p, { desc }) => [desc(p.createdAt)] } },
    });

    return ok({
      subscription: sub ?? null,
      razorpayKeyId: RAZORPAY_KEY_ID ?? null,
      isConfigured: isRazorpayConfigured(),
    });
  });
}

const createOrderSchema = z.object({
  plan: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]),
});

const PLAN_PRICES: Record<string, number> = {
  STARTER: 99900,
  PROFESSIONAL: 249900,
  ENTERPRISE: 499900,
};

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isRazorpayConfigured()) {
      return err("Payment gateway not configured. Contact support.", 503);
    }

    const input = await parseBody(req, createOrderSchema);
    const amount = PLAN_PRICES[input.plan];
    if (!amount) return err("Invalid plan", 400);

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: `sub_${session.orgId}_${Date.now()}`,
        notes: {
          orgId: session.orgId,
          plan: input.plan,
          userId: session.user.id,
        },
      }),
    });

    if (!orderRes.ok) {
      const errorData = await orderRes.json().catch(() => ({}));
      return err(`Razorpay order creation failed: ${(errorData as { error?: { description?: string } }).error?.description || "Unknown error"}`, 502);
    }

    const order = await orderRes.json() as { id: string; amount: number; currency: string };

    return ok({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
      plan: input.plan,
    });
  });
}

const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  plan: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]),
});

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, verifySchema);

    const generatedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET ?? "")
      .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== input.razorpay_signature) {
      return err("Payment verification failed: invalid signature", 400);
    }

    const amount = PLAN_PRICES[input.plan];

    const existing = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.orgId, session.orgId),
    });

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    if (existing) {
      await db.update(subscriptions).set({
        plan: input.plan,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        updatedAt: now,
      }).where(eq(subscriptions.id, existing.id));
    } else {
      await db.insert(subscriptions).values({
        orgId: session.orgId,
        plan: input.plan,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
    }

    const subRecord = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.orgId, session.orgId),
    });

    if (subRecord) {
      await db.insert(subscriptionPayments).values({
        orgId: session.orgId,
        subscriptionId: subRecord.id,
        razorpayPaymentId: input.razorpay_payment_id,
        razorpayOrderId: input.razorpay_order_id,
        amount: (amount / 100).toFixed(2),
        currency: "INR",
        status: "captured",
        paidAt: now,
      });
    }

    void createAuditLog({
      action: "settings.updated",
      userId: session.user.id,
      orgId: session.orgId,
      targetType: "subscription",
      metadata: { plan: input.plan, paymentId: input.razorpay_payment_id },
    }).catch(() => {});

    return ok({ success: true, plan: input.plan, status: "ACTIVE" });
  });
}
