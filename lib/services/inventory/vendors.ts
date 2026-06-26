import { z } from "zod";
import { db } from "@/lib/db";
import { invVendors } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const createVendorSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  gstin: z.string().regex(GSTIN_REGEX).optional(),
  leadTimeDays: z.number().int().min(0).max(365).default(7),
  paymentTermsDays: z.number().int().min(0).max(365).default(30),
  currency: z.string().length(3).default("INR"),
  clientId: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;

export const updateVendorSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  gstin: z.string().regex(GSTIN_REGEX).optional(),
  leadTimeDays: z.number().int().min(0).max(365).optional(),
  paymentTermsDays: z.number().int().min(0).max(365).optional(),
  currency: z.string().length(3).optional(),
  clientId: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

export const listVendorsSchema = z.object({
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListVendorsInput = z.infer<typeof listVendorsSchema>;

async function generateVendorCode(orgId: string, name: string): Promise<string> {
  const prefix = name.trim().slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "X");
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invVendors)
    .where(eq(invVendors.orgId, orgId));
  const seq = ((countResult?.count ?? 0) + 1).toString().padStart(4, "0");
  return `${prefix}-${seq}`;
}

export async function createVendor(orgId: string, userId: string, input: CreateVendorInput) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || 'inv_vendor'))`,
    );

    const code = input.code ?? (await generateVendorCode(orgId, input.name));

    const [vendor] = await tx
      .insert(invVendors)
      .values({
        orgId,
        name: input.name,
        code,
        email: input.email ?? null,
        phone: input.phone ?? null,
        address: input.address ?? null,
        gstin: input.gstin ?? null,
        leadTimeDays: input.leadTimeDays,
        paymentTermsDays: input.paymentTermsDays,
        currency: input.currency,
        clientId: input.clientId ?? null,
        notes: input.notes ?? null,
        createdBy: userId,
      })
      .returning();

    return vendor;
  });
}

export async function updateVendor(
  orgId: string,
  vendorId: number,
  input: UpdateVendorInput,
) {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) updateData.name = input.name;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.gstin !== undefined) updateData.gstin = input.gstin;
  if (input.leadTimeDays !== undefined) updateData.leadTimeDays = input.leadTimeDays;
  if (input.paymentTermsDays !== undefined) updateData.paymentTermsDays = input.paymentTermsDays;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.clientId !== undefined) updateData.clientId = input.clientId;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  const [updated] = await db
    .update(invVendors)
    .set(updateData)
    .where(and(eq(invVendors.id, vendorId), eq(invVendors.orgId, orgId)))
    .returning();

  return updated;
}
