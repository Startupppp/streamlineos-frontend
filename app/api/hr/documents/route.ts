import { withAuth, ok, err } from "@/lib/api/helpers";
import { getDocuments } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { documents, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import type { DocumentType } from "@/types/hr";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const isAdmin = isAdminOrOwner(session.user.role);
    const filterUserId = searchParams.get("userId") ?? undefined;
    const type = searchParams.get("type") ?? undefined;

    if (filterUserId && filterUserId !== session.user.id && !isAdmin) {
      return err("Not authorized to view other users' documents.", 403);
    }

    const data = await getDocuments(session.orgId, session.user.id, isAdmin, {
      filterUserId,
      type,
    });

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);

    const body = await req.json() as {
      name: string;
      type: DocumentType;
      fileUrl: string;
      fileSize?: number;
      mimeType?: string;
      userId?: string;
    };

    if (!body.name || !body.type || !body.fileUrl) {
      return err("name, type, and fileUrl are required.", 400);
    }

    const targetUserId =
      body.userId && isAdmin ? body.userId : session.user.id;

    if (targetUserId !== session.user.id) {
      const targetMember = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, targetUserId),
          eq(organizationMembers.orgId, session.orgId)
        ),
      });
      if (!targetMember) {
        return err("Target user not found in your organization.", 404);
      }
    }

    const [document] = await db
      .insert(documents)
      .values({
        orgId: session.orgId,
        userId: targetUserId,
        name: body.name,
        type: body.type,
        fileUrl: body.fileUrl,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
        uploadedBy: session.user.id,
        isActive: true,
      })
      .returning();

    return ok(document);
  });
}
