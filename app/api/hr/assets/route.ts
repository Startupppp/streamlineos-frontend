import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getAssets } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { assets, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { sendAssetAssignedEmail } from "@/lib/email";
import { assetFormSchema } from "@/lib/validations/hr-assets";

const postAssetSchema = assetFormSchema;

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

    const body = await parseBody(req, postAssetSchema);

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

    if (body.assignedTo) {
      void (async () => {
        const employee = await db.query.users.findFirst({
          where: eq(users.id, body.assignedTo!),
          columns: { email: true, name: true },
        });
        if (employee?.email) {
          await sendAssetAssignedEmail(
            employee.email,
            employee.name ?? "Employee",
            body.name,
            body.type,
            body.serialNumber ?? null
          );
        }
      })().catch(() => {});
    }

    return ok(asset);
  });
}
