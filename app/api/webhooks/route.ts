import { type NextRequest } from "next/server";
import { withAuth, withAdmin, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { webhookEndpoints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
    // Mask the secret before returning
    const safe = endpoints.map(({ secret: _secret, ...rest }) => rest);
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
    // Return the secret once on creation so the admin can copy it
    return ok(endpoint, 201);
  });
}
