import { withAuth, withAbility, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { careerLadders } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const levelSchema = z.object({
  level: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  minExperience: z.number().min(0),
  skills: z.array(z.string()),
});

const createSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(150, "Title must be at most 150 characters")
    .refine((v) => /[a-zA-Z]/.test(v), "Title must contain at least one letter")
    .refine((v) => !/\s{2,}/.test(v), "Title cannot have multiple consecutive spaces"),
  department: z.string().optional(),
  description: z.string().max(1000).optional(),
  levels: z.array(levelSchema).optional().default([]),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await db
      .select()
      .from(careerLadders)
      .where(eq(careerLadders.orgId, session.orgId))
      .orderBy(desc(careerLadders.createdAt));

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "hr:career-ladders", async (session) => {
    const body = createSchema.parse(await req.json());

    const [record] = await db
      .insert(careerLadders)
      .values({
        orgId: session.orgId,
        title: body.title,
        department: body.department ?? null,
        levels: body.levels ?? [],
      })
      .returning();

    return ok(record, 201);
  });
}
