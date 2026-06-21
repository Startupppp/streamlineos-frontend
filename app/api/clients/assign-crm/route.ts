import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { logger } from "@/lib/logger";
import {
  backfillCrmAssignments,
  getCrmAssignmentStats,
} from "@/server/queries/crm-clients";


export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const stats = await getCrmAssignmentStats(session.orgId);
    return ok(stats);
  });
}


export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      await backfillCrmAssignments(session.orgId);
      const stats = await getCrmAssignmentStats(session.orgId);
      return ok(stats);
    } catch (error) {
      logger.error("[assign-crm] Error", { error });
      return err("Failed to assign CRM reps. Please try again.", 500);
    }
  });
}
