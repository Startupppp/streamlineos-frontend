import { withAuth, ok, err } from "@/lib/api/helpers";
import { getDepartments } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import type { NextRequest } from "next/server";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getDepartments(session.orgId);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only Admins and Owners can create departments.", 403);
    }

    const body = await req.json() as { name?: string };
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return err("Department name is required.", 400);
    }

    await db.insert(departments).values({
      name: body.name.trim(),
      orgId: session.orgId,
    });

    return ok({ success: true });
  });
}
