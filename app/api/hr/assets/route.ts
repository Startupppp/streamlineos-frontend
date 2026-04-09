import { withAuth, ok, err } from "@/lib/api/helpers";
import { getAssets } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getAssets(session.orgId);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can create assets.", 403);
    }

    const body = await req.json() as {
      name: string;
      type: string;
      status?: string;
      serialNumber?: string;
      assignedTo?: string;
      purchaseDate?: string;
      purchaseCost?: number;
      location?: string;
      notes?: string;
    };

    if (!body.name || !body.type) {
      return err("name and type are required.", 400);
    }

    const [asset] = await db
      .insert(assets)
      .values({
        orgId: session.orgId,
        name: body.name,
        type: body.type,
        serialNumber: body.serialNumber,
        assignedTo: body.assignedTo,
        purchaseDate: body.purchaseDate
          ? formatDateOnly(new Date(body.purchaseDate))
          : undefined,
        purchaseCost: body.purchaseCost?.toString(),
        location: body.location,
        notes: body.notes,
        status: (body.status as "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "RETIRED") ?? (body.assignedTo ? "ASSIGNED" : "AVAILABLE"),
      })
      .returning();

    return ok(asset);
  });
}
