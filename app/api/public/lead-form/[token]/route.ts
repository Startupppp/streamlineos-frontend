
import { db } from "@/lib/db";
import { webLeadForms, leads } from "@/lib/db/schema/crm";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api/helpers";

const leadFormBodySchema = z.record(z.string(), z.unknown());

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

  const body = await parseBody(req, leadFormBodySchema);

  const fields = (form.fields ?? []) as Array<{ name: string; label: string; required: boolean }>;
  for (const field of fields) {
    const val = body[field.name];
    if (field.required && (val === undefined || val === null || val === "")) {
      return NextResponse.json({ error: `${field.label} is required` }, { status: 400 });
    }
  }

  const strField = (key: string): string | null => {
    const val = body[key];
    return typeof val === "string" && val.length > 0 ? val : null;
  };

  const leadName =
    strField("name") ??
    strField("full_name") ??
    (strField("first_name")
      ? `${strField("first_name") ?? ""}${strField("last_name") ? " " + strField("last_name") : ""}`.trim()
      : null) ??
    "Unknown";

  const leadNotes = strField("message") ?? strField("notes");

  await db.insert(leads).values({
    orgId: form.orgId,
    name: leadName,
    email: strField("email"),
    phone: strField("phone"),
    company: strField("company"),
    notes: leadNotes,
    source: "website",
    customData: body,
  });

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
