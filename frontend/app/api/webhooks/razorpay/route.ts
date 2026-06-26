import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { platformPayments, organizations } from "@/lib/db/schema";
import { verifyWebhookSignature } from "@/lib/razorpay/client";
import { logger } from "@/lib/logger";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const razorpayPaymentSchema = z.object({
  id: z.string().min(1),
  order_id: z.string().optional(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  method: z.string().optional(),
  email: z.string().optional(),
  description: z.string().optional(),
  notes: z.record(z.string(), z.string()).optional(),
  invoice_id: z.string().optional(),
  created_at: z.number().optional(),
});

const webhookEventSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z.object({ entity: razorpayPaymentSchema }).optional(),
  }),
});

type WebhookEvent = z.infer<typeof webhookEventSchema>;

async function findOrgFromNotes(notes?: Record<string, string>) {
  if (!notes) return null;
  const slug = notes.org_slug || notes.organization_slug || notes.orgSlug;
  if (!slug) return null;
  return db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
    columns: { id: true },
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    logger.warn("[razorpay] invalid webhook signature");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let event: WebhookEvent;
  try {
    const parsed = webhookEventSchema.safeParse(JSON.parse(rawBody));
    if (!parsed.success) {
      logger.warn("[razorpay] webhook payload validation failed", { issues: parsed.error.issues });
      return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
    }
    event = parsed.data;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment) {
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  const org = await findOrgFromNotes(payment.notes);

  try {
    const existing = await db.query.platformPayments.findFirst({
      where: eq(platformPayments.razorpayPaymentId, payment.id),
      columns: { id: true },
    });

    const fields = {
      razorpayPaymentId: payment.id,
      razorpayOrderId: payment.order_id ?? null,
      orgId: org?.id ?? null,
      customerEmail: payment.email ?? null,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.method ?? null,
      description: payment.description ?? null,
      metadata: payment.notes ? { notes: payment.notes } : null,
      capturedAt: payment.status === "captured" ? new Date() : null,
      refundedAt: payment.status === "refunded" ? new Date() : null,
    };

    if (existing) {
      await db
        .update(platformPayments)
        .set(fields)
        .where(eq(platformPayments.id, existing.id));
    } else {
      await db.insert(platformPayments).values(fields);
    }

    revalidateTag("owner-metrics", "default");
  } catch (error) {
    logger.error("[razorpay] failed to persist payment", { error });
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
