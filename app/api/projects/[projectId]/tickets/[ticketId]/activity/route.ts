import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets, users } from "@/lib/db/schema";
import { ticketActivityLog } from "@/lib/db/schema/projects/activity";
import { eq, and, desc } from "drizzle-orm";

type RouteContext = { params: Promise<{ projectId: string; ticketId: string }> };

const ACTION_LABELS: Record<string, string> = {
  created: "created this ticket",
  status_changed: "changed status",
  priority_changed: "changed priority",
  assignee_changed: "changed assignee",
  title_changed: "renamed the ticket",
  sprint_changed: "changed sprint",
  due_date_changed: "changed due date",
  comment_added: "added a comment",
  label_changed: "changed labels",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ");
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: projectIdStr, ticketId: ticketIdStr } = await ctx.params;
    const projectId = Number(projectIdStr);
    const ticketId = Number(ticketIdStr);
    if (!Number.isFinite(projectId)) return err("Invalid project ID", 400);
    if (!Number.isFinite(ticketId)) return err("Invalid ticket ID", 400);

    const ticket = await db.query.tickets.findFirst({
      where: and(
        eq(tickets.id, ticketId),
        eq(tickets.projectId, projectId),
        eq(tickets.orgId, session.orgId),
      ),
      columns: { id: true },
    });
    if (!ticket) return err("Ticket not found", 404);

    const rows = await db
      .select({
        id: ticketActivityLog.id,
        action: ticketActivityLog.action,
        fromValue: ticketActivityLog.fromValue,
        toValue: ticketActivityLog.toValue,
        createdAt: ticketActivityLog.createdAt,
        userId: ticketActivityLog.userId,
        userName: users.name,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userImage: users.image,
      })
      .from(ticketActivityLog)
      .leftJoin(users, eq(users.id, ticketActivityLog.userId))
      .where(
        and(
          eq(ticketActivityLog.ticketId, ticketId),
          eq(ticketActivityLog.orgId, session.orgId),
        ),
      )
      .orderBy(desc(ticketActivityLog.createdAt), desc(ticketActivityLog.id));

    const activity = rows.map((row) => {
      const fallbackName = `${row.userFirstName ?? ""} ${row.userLastName ?? ""}`.trim();
      const resolvedName = row.userName ?? (fallbackName.length > 0 ? fallbackName : null);
      return {
        id: row.id,
        action: row.action,
        label: actionLabel(row.action),
        fromValue: row.fromValue,
        toValue: row.toValue,
        createdAt: row.createdAt,
        user: row.userId
          ? { id: row.userId, name: resolvedName, image: row.userImage }
          : null,
      };
    });

    return ok(activity);
  });
}
