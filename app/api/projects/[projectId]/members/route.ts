

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.string().default("CONTRIBUTOR"),
});

const removeMemberSchema = z.object({
  userId: z.string().min(1),
});

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const members = await db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        image: users.image,
        email: users.email,
        role: projectMembers.role,
        joinedAt: projectMembers.joinedAt,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId));

    return ok(members);
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const body = await parseBody(req, addMemberSchema);

    const existing = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, body.userId)
      ),
    });

    if (existing) return err("User is already a project member", 409);

    const [member] = await db
      .insert(projectMembers)
      .values({
        projectId,
        userId: body.userId,
        role: body.role,
      })
      .returning();

    return ok(member, 201);
  });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const body = await parseBody(req, removeMemberSchema);

    await db
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, body.userId)
        )
      );

    return ok({ success: true });
  });
}
