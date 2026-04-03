import { withAuth, ok } from "@/lib/api/helpers";
import { getLeadBoard } from "@/server/queries/leads";

export async function GET() {
  return withAuth(async (session) => {
    const board = await getLeadBoard(session.orgId!, {
      role: session.user.role ?? undefined,
      userId: session.user.id,
    });
    return ok(board);
  });
}
