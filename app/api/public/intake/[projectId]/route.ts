import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeItems, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const intakeSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  submitterEmail: z.string().email().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const pid = parseInt(projectId);

  if (isNaN(pid)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = intakeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [project] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, pid));

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const [item] = await db
    .insert(intakeItems)
    .values({
      projectId: pid,
      orgId: project.orgId,
      title: parsed.data.title,
      description: parsed.data.description
        ? {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: parsed.data.description }],
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
