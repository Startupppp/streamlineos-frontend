
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema/crm";
import { organizations } from "@/lib/db/schema/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/security/verify-turnstile";

const submitSchema = z.object({
  orgId: z.string().min(1),
  name: z.string().min(1).max(200),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  message: z.string().max(5000).optional().nullable(),
  utmSource: z.string().max(200).optional().nullable(),
  utmMedium: z.string().max(200).optional().nullable(),
  utmCampaign: z.string().max(200).optional().nullable(),
  utmContent: z.string().max(200).optional().nullable(),
  utmTerm: z.string().max(200).optional().nullable(),
  referrerUrl: z.string().max(2000).optional().nullable(),
  
  cfTurnstileToken: z.string().optional(),
});


function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  const rl = await checkRateLimit("landing-submit", ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSecs) },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return NextResponse.json({ error: `Validation failed: ${detail}` }, { status: 400 });
  }

  const data = parsed.data;

  const turnstile = await verifyTurnstileToken(data.cfTurnstileToken, ip);
  if (!turnstile.ok) {
    const status = turnstile.reason === "misconfigured" ? 500 : 403;
    return NextResponse.json(
      { error: "Bot verification failed. Please refresh the page and try again." },
      { status },
    );
  }

  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, data.orgId));

  if (!org) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const [lead] = await db
    .insert(leads)
    .values({
      orgId: data.orgId,
      name: data.name.trim(),
      email: data.email ?? null,
      phone: data.phone ?? null,
      company: data.company ?? null,
      notes: data.message ?? null,
      source: "website",
      status: "NEW",
      utmSource: data.utmSource ?? null,
      utmMedium: data.utmMedium ?? null,
      utmCampaign: data.utmCampaign ?? null,
      utmContent: data.utmContent ?? null,
      utmTerm: data.utmTerm ?? null,
      ipAddress: ip === "unknown" ? null : ip,
      referrerUrl: data.referrerUrl ?? null,
    })
    .returning({ id: leads.id });

  return NextResponse.json({ id: lead.id }, { status: 201 });
}
