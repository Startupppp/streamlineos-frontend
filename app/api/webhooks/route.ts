import { type NextRequest } from "next/server";
import { withAuth, withAdmin, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { webhookEndpoints } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "crypto";

const createSchema = z.object({
  url: z.string().url(),
  description: z.string().optional(),
  events: z.array(z.string()).default([]),
});

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const endpoints = await db.query.webhookEndpoints.findMany({
      where: eq(webhookEndpoints.orgId, session.orgId),
      orderBy: [desc(webhookEndpoints.createdAt)],
    });

    const safe = endpoints.map((ep) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { secret: _s, ...rest } = ep;
      return rest;
    });
    return ok(safe);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, createSchema);
    const secret = randomBytes(32).toString("hex");
    const [endpoint] = await db
      .insert(webhookEndpoints)
      .values({
        orgId: session.orgId,
        url: body.url,
        secret,
        description: body.description,
        events: body.events,
        createdBy: session.user.id,
      })
      .returning();

    return ok(endpoint, 201);
  });
}
