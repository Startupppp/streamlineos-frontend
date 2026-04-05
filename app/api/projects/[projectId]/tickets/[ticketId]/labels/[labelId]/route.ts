import { NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketLabelMappings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = {
  params: Promise<{ projectId: string; ticketId: string; labelId: string }>;
};

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async () => {
    const { ticketId: tid, labelId: lid } = await params;
    const ticketId = Number(tid);
    const labelId = Number(lid);
    if (!ticketId || !labelId) return err("Invalid ids", 400);

    await db
      .delete(ticketLabelMappings)
      .where(
        and(
          eq(ticketLabelMappings.ticketId, ticketId),
          eq(ticketLabelMappings.labelId, labelId)
        )
      );

    return ok({ success: true });
  });
}
