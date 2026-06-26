import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { logger } from "@/lib/logger";
import { findDuplicateLeads } from "@/server/queries/duplicate-leads";

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const groups = await findDuplicateLeads(session.orgId);
      const total = groups.length;
      return ok({ groups, total });
    } catch (e) {
      logger.error("[duplicates] Error finding duplicate leads", { error: e });
      return err("Failed to scan for duplicates", 500);
    }
  });
}
