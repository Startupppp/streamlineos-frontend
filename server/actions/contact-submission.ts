"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { organizations, leads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Enter a valid email"),
  company: z.string().max(200).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  topic: z.enum(["sales", "support", "partnership", "press", "other"]).default("sales"),
  message: z.string().min(10, "Tell us a little more").max(5000),
});

export type ContactInput = z.infer<typeof contactSchema>;

export type ContactResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof ContactInput, string>> };

const DEFAULT_ORG_SLUG = "streamlineos-capital";

export async function submitContactForm(raw: unknown): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof ContactInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof ContactInput;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }

  const data = parsed.data;

  try {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, DEFAULT_ORG_SLUG),
    });

    if (org) {
      await db.insert(leads).values({
        orgId: org.id,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        company: data.company || null,
        source: "website",
        subSource: `contact-form:${data.topic}`,
        notes: data.message,
        status: "NEW",
        priority: data.topic === "sales" ? "HOT" : "WARM",
        tags: [`contact-form`, data.topic],
      });
    } else {
      console.warn(
        `[contact-form] No org found with slug "${DEFAULT_ORG_SLUG}". Submission from ${data.email} not persisted.`,
      );
    }
  } catch (error) {
    console.error("[contact-form] Failed to persist submission:", error);
  }

  return { ok: true };
}
