import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be at most 100 characters"),
  subject: z.string().trim().min(2, "Subject must be at least 2 characters").max(200, "Subject must be at most 200 characters"),
  body: z.string().min(10, "Body must be at least 10 characters"),
  category: z.string().optional(),
  variables: z.array(z.string()).optional(),
});

export async function GET() {
  return withAbility("manage", "hr:email-templates", async (session) => {
    const data = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.orgId, session.orgId))
      .orderBy(desc(emailTemplates.createdAt));

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "hr:email-templates", async (session) => {
    const body = await parseBody(req, createSchema);

    const existing = await db.query.emailTemplates.findFirst({
      where: and(
        eq(emailTemplates.orgId, session.orgId),
        sql`lower(trim(${emailTemplates.name})) = ${body.name.toLowerCase()}`,
      ),
      columns: { id: true },
    });
    if (existing) return err("A template with this name already exists.", 409);

    const [record] = await db
      .insert(emailTemplates)
      .values({
        orgId: session.orgId,
        name: body.name,
        subject: body.subject,
        body: body.body,
        category: body.category ?? "GENERAL",
        variables: body.variables ?? null,
        createdBy: session.user.id,
      })
      .returning();

    return ok(record, 201);
  });
}
