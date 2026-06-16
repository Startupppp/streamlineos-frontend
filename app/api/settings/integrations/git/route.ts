import { type NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { withAbility, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { gitConnections } from "@/lib/db/schema";
import { appUrl } from "@/lib/app-url";

const createSchema = z.object({
  provider: z.enum(["github", "gitlab", "bitbucket"]),
  repoUrl: z.string().url().max(500),
  repoName: z.string().max(200).optional(),
});

function maskSecret(secret: string): string {
  if (secret.length <= 4) return "••••";
  return `${secret.slice(0, 4)}${"•".repeat(8)}`;
}

function webhookUrl(connectionId: number): string {
  return `${appUrl}/api/integrations/git/webhook?connectionId=${connectionId}`;
}

export async function GET() {
  return withAbility("manage", "settings", async (session) => {
    const rows = await db
      .select()
      .from(gitConnections)
      .where(eq(gitConnections.orgId, session.orgId))
      .orderBy(desc(gitConnections.id));

    const data = rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      repoUrl: row.repoUrl,
      repoName: row.repoName,
      isActive: row.isActive,
      maskedSecret: maskSecret(row.webhookSecret),
      webhookUrl: webhookUrl(row.id),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "settings", async (session) => {
    const input = await parseBody(req, createSchema);
    const secret = nanoid(40);

    const [created] = await db
      .insert(gitConnections)
      .values({
        orgId: session.orgId,
        provider: input.provider,
        repoUrl: input.repoUrl,
        repoName: input.repoName ?? null,
        webhookSecret: secret,
        createdBy: session.user.id,
      })
      .returning();

    return ok(
      {
        id: created.id,
        provider: created.provider,
        repoUrl: created.repoUrl,
        repoName: created.repoName,
        isActive: created.isActive,
        webhookUrl: webhookUrl(created.id),
        webhookSecret: secret,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
      201,
    );
  });
}
