import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { invitations, organizations, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import { sendInvitationEmail } from "@/lib/email";
import { z } from "zod";

const schema = z.object({ invitationId: z.string().min(1) });

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();
    if (!ability.can("manage", "settings")) return err("Forbidden", 403);

    const body = await parseBody(req, schema);

    const invitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.id, body.invitationId),
        eq(invitations.orgId, session.orgId)
      ),
    });

    if (!invitation) return err("Invitation not found", 404);
    if (invitation.acceptedAt) return err("Invitation already accepted", 400);

    const newExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await db
      .update(invitations)
      .set({ expiresAt: newExpiresAt })
      .where(eq(invitations.id, body.invitationId));

    const [org, inviter] = await Promise.all([
      db.query.organizations.findFirst({
        where: eq(organizations.id, session.orgId),
        columns: { name: true },
      }),
      db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: { name: true, firstName: true, lastName: true },
      }),
    ]);

    const inviterName =
      inviter?.firstName && inviter?.lastName
        ? `${inviter.firstName} ${inviter.lastName}`
        : inviter?.name ?? undefined;

    await sendInvitationEmail(
      invitation.email,
      invitation.token,
      org?.name ?? "StreamlineOS",
      inviterName
    );

    return ok({ success: true });
  });
}
