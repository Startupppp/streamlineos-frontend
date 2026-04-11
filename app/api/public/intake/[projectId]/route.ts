import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeItems, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;

const intakeSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  submitterEmail: z.string().email().optional(),
});

function sanitizeText(text: string): string {

  return text.replace(/^[=+\-@\t\r]+/, "");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const pid = parseInt(projectId);

  if (isNaN(pid) || pid <= 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = intakeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const [project] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, pid));

  if (!project) {

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const sanitizedTitle = sanitizeText(parsed.data.title);
  const sanitizedDescription = parsed.data.description
    ? sanitizeText(parsed.data.description)
    : undefined;

  const [item] = await db
    .insert(intakeItems)
    .values({
      projectId: pid,
      orgId: project.orgId,
      title: sanitizedTitle,
      description: sanitizedDescription
        ? {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: sanitizedDescription }],
              },
            ],
          }
        : null,
      source: "web_form",
      submitterEmail: parsed.data.submitterEmail,
    })
    .returning({ id: intakeItems.id });

  return NextResponse.json({ id: item.id, message: "Request submitted successfully" }, { status: 201 });
}
