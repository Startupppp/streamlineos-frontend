import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { teamEvents, teamEventParticipants } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(["TEAM_BUILDING", "OFFSITE", "CELEBRATION", "WORKSHOP", "SPORTS", "OTHER"]).optional().default("TEAM_BUILDING"),
  date: z.string().optional(),
  startDate: z.string().optional(),
  time: z.string().optional(),
  location: z.string().max(200).optional(),
  maxParticipants: z.number().int().positive().optional(),
}).refine((d) => !!(d.date || d.startDate), { message: "Event date is required" });

export async function GET() {
  return withAuth(async (session) => {
    const data = await db.query.teamEvents.findMany({
      where: eq(teamEvents.orgId, session.orgId),
      with: { participants: true, organizer: true },
      orderBy: [desc(teamEvents.date)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:employees"))  return err("Only admins can create events.", 403);
    const body = await parseBody(req, createSchema);
    const rawDate = body.date ?? body.startDate ?? "";
    const eventDate = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;
    const eventTime = body.time ?? (rawDate.includes("T") ? rawDate.split("T")[1]?.slice(0, 5) : undefined);
    const [event] = await db.insert(teamEvents).values({
      orgId: session.orgId,
      title: body.title,
      description: body.description,
      type: body.type,
      date: eventDate,
      time: eventTime,
      location: body.location,
      maxParticipants: body.maxParticipants,
      organizedBy: session.user.id,
    }).returning();
    return ok(event, 201);
  });
}
