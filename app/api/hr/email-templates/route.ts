import { withAbility, ok, parseBody } from "@/lib/api/helpers"; 
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
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
