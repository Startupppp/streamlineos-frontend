import { type NextRequest } from "next/server";
import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomUUID, randomBytes } from "crypto";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  expiresAt: z.string().datetime().optional(),
});

function generateApiKey(): { raw: string; prefix: string } {
  const raw = `vmc_${randomBytes(24).toString("hex")}`;
  const prefix = raw.slice(0, 12);
  return { raw, prefix };
}

export async function GET() {
  return withAdmin(async (session) => {
    const keys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.orgId, session.orgId),
      orderBy: [desc(apiKeys.createdAt)],
      with: { creator: { columns: { name: true, firstName: true, lastName: true } } },
    });

    return ok(
      keys.map((k) => ({
        id: k.id,
        name: k.name,
        description: k.description,
        keyPrefix: k.keyPrefix,
        isRevoked: k.isRevoked,
        lastUsedAt: k.lastUsedAt,
        expiresAt: k.expiresAt,
        createdAt: k.createdAt,
        createdBy: k.creator?.name ?? k.creator?.firstName ?? "Unknown",
      }))
    );
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await req.json() as unknown;
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);

    const { name, description, expiresAt } = parsed.data;
    const { raw, prefix } = generateApiKey();
    const keyHash = await bcrypt.hash(raw, 10);

    await db.insert(apiKeys).values({
      id: randomUUID(),
      orgId: session.orgId,
      name,
      description: description ?? null,
      keyHash,
      keyPrefix: prefix,
      createdBy: session.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    return ok({ key: raw, prefix }, 201);
  });
}
