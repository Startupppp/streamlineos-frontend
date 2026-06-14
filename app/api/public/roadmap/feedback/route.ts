import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedbackPosts, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  org: z.string().trim().min(1),
});

const bodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().optional(),
});

function sanitizeText(text: string): string {
  return text.replace(/^[=+\-@\t\r]+/, "");
}

export async function POST(req: NextRequest) {
  const parsedQuery = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries()),
  );
  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const orgId = parsedQuery.data.org;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsedBody = bodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { id: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const { title, description, name, email } = parsedBody.data;

  const [post] = await db
    .insert(feedbackPosts)
    .values({
      orgId,
      title: sanitizeText(title),
      description: description ? sanitizeText(description) : null,
      status: "open",
      submittedByName: name ?? null,
      submittedByEmail: email ?? null,
    })
    .returning({ id: feedbackPosts.id });

  return NextResponse.json({ id: post.id, message: "Feedback submitted" }, { status: 201 });
}
