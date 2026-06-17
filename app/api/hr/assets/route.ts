import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getAssets } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { assets, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { sendAssetAssignedEmail } from "@/lib/email";

const postAssetSchema = z.object({
  name: z
    .string()
    .min(2, "Asset name must be at least 2 characters")
    .max(100, "Asset name is too long")
    .refine((v) => v === v.trim(), "Asset name must not have leading or trailing spaces")
    .refine((v) => !/\s{2,}/.test(v), "Asset name cannot have consecutive spaces")
    .refine((v) => /[a-zA-Z]/.test(v), "Asset name must contain at least one letter")
    .refine((v) => !/^[\d\s]+$/.test(v), "Asset name cannot be numeric only")
    .refine((v) => !/[!@#$%^&*()\-_=+\[\]{};:'",.<>?/\\|`~]{2,}/.test(v), "Asset name cannot contain multiple consecutive special characters"),
  type: z.string().min(1, "Type is required"),
  brand: z
    .string()
    .min(1, "Brand is required")
    .max(100, "Brand is too long")
    .refine((v) => /[a-zA-Z]/.test(v.trim()), "Brand must contain at least one letter"),
  model: z
    .string()
    .min(1, "Model is required")
    .max(100, "Model is too long"),
  serialNumber: z
    .string()
    .min(3, "Serial number must be at least 3 characters")
    .max(100, "Serial number is too long")
    .refine((v) => /[a-zA-Z0-9]/.test(v.trim()), "Serial number must contain alphanumeric characters"),
  purchaseDate: z.string().optional(),
  purchaseCost: z.number().optional(),
  location: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await getAssets(session.orgId);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:assets")) {
      return err("Only admins can create assets.", 403);
    }

    const body = await parseBody(req, postAssetSchema);

    const existing = await db.query.assets.findFirst({
      where: and(
        eq(assets.orgId, session.orgId),
        sql`lower(trim(${assets.serialNumber})) = ${body.serialNumber.trim().toLowerCase()}`,
      ),
      columns: { id: true },
    });

    if (existing) {
      return err("An asset with this serial number already exists.", 409);
    }

    const [asset] = await db
      .insert(assets)
      .values({
        orgId: session.orgId,
        name: body.name,
        type: body.type,
        brand: body.brand,
        model: body.model,
        serialNumber: body.serialNumber,
        purchaseDate: body.purchaseDate
          ? formatDateOnly(new Date(body.purchaseDate))
          : undefined,
        purchaseCost: body.purchaseCost?.toString(),
        location: body.location,
        notes: body.notes,
        status: "AVAILABLE",
      })
      .returning();

    return ok(asset, 201);
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();
    if (!ability.can("manage", "hr:assets")) {
      return err("Only admins can assign assets.", 403);
    }

    const assignSchema = z.object({
      assetId: z.number(),
      assignedTo: z.string().nullable(),
    });

    const body = await parseBody(req, assignSchema);

    const target = await db.query.assets.findFirst({
      where: and(eq(assets.id, body.assetId), eq(assets.orgId, session.orgId)),
      columns: { assignedTo: true, name: true, type: true, serialNumber: true },
    });

    if (!target) return err("Asset not found.", 404);

    await db
      .update(assets)
      .set({
        assignedTo: body.assignedTo,
        status: body.assignedTo ? "ASSIGNED" : "AVAILABLE",
        updatedAt: new Date(),
      })
      .where(and(eq(assets.id, body.assetId), eq(assets.orgId, session.orgId)));

    if (body.assignedTo && body.assignedTo !== target.assignedTo) {
      void (async () => {
        const employee = await db.query.users.findFirst({
          where: eq(users.id, body.assignedTo!),
          columns: { email: true, name: true },
        });
        if (employee?.email) {
          await sendAssetAssignedEmail(
            employee.email,
            employee.name ?? "Employee",
            target.name,
            target.type,
            target.serialNumber ?? null,
          );
        }
      })().catch(() => {});
    }

    return ok({ success: true });
  });
}
