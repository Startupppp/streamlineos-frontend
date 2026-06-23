import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { cached, CACHE_TTL } from "@/lib/cache";
import { getLeadBoard } from "@/server/queries/leads";
import { z } from "zod";

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(200).default(50),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { limit } = parseQuery(req, querySchema);
    const orgId = session.orgId!;
    const role = session.user.role ?? "";
    const userId = session.user.id;
    const branchId = session.branchId;
    const key = `leads:board:${orgId}:${userId}:${role}:${branchId ?? ""}:${limit}`;

    const limited = await cached(
      key,
      async () => {
        const board = await getLeadBoard(orgId, {
          role: role || undefined,
          userId,
          branch: { role, branchId, userId },
          limitPerStatus: limit,
        });
        const out: Record<string, unknown[]> = {};
        for (const [status, items] of Object.entries(board)) {
          out[status] = (items as unknown[]).slice(0, limit);
        }
        return out;
      },
      { ttlSeconds: CACHE_TTL.SHORT },
    );

    return ok(limited);
  });
}
