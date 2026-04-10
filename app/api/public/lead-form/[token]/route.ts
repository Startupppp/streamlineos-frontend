/**
 * Public (unauthenticated) route for web-to-lead form rendering and submission.
 */
import { db } from "@/lib/db";
import { webLeadForms, leads } from "@/lib/db/schema/crm";
import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  const [form] = await db
    .select({
      name: webLeadForms.name,
      fields: webLeadForms.fields,
      submitMessage: webLeadForms.submitMessage,
      redirectUrl: webLeadForms.redirectUrl,
      isActive: webLeadForms.isActive,
    })
    .from(webLeadForms)
    .where(eq(webLeadForms.publicToken, token));

  if (!form || !form.isActive) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  return NextResponse.json({ form });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;

  const [form] = await db
    .select()
    .from(webLeadForms)
    .where(eq(webLeadForms.publicToken, token));

  if (!form || !form.isActive) {
    return NextResponse.json({ error: "Form not found or inactive" }, { status: 404 });
  }

  const body = await req.json() as Record<string, string>;

  // Validate required fields
  const fields = (form.fields ?? []) as Array<{ name: string; label: string; required: boolean }>;
  for (const field of fields) {
    if (field.required && !body[field.name]) {
      return NextResponse.json({ error: `${field.label} is required` }, { status: 400 });
    }
  }

  // Build the lead — name is required; derive it from form data
  const leadName =
    (body.name as string) ||
    (body.full_name as string) ||
    (body.first_name
      ? `${body.first_name}${body.last_name ? " " + body.last_name : ""}`
      : null) ||
    "Unknown";

  await db.insert(leads).values({
    orgId: form.orgId,
    name: leadName,
    email: (body.email as string) ?? null,
    phone: (body.phone as string) ?? null,
    company: (body.company as string) ?? null,
    notes: body.message ?? body.notes ?? null,
    source: "website",
    customData: body as Record<string, unknown>,
  });

  // Increment submission counter
  await db
    .update(webLeadForms)
    .set({
      totalSubmissions: sql`${webLeadForms.totalSubmissions} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(webLeadForms.id, form.id));

  return NextResponse.json({
    success: true,
    message: form.submitMessage ?? "Thank you! We'll be in touch soon.",
    redirectUrl: form.redirectUrl ?? null,
  });
}
