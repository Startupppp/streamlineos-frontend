import { type NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { z } from "zod";

const schema = z.object({ token: z.string() });

export async function POST(req: NextRequest) {
  let token: string;
  try {
    const body = await req.json();
    ({ token } = schema.parse(body));
  } catch {
    return err("Invalid request body", 400);
  }

  const tokenRecord = await db.query.verificationTokens.findFirst({
    where: and(
      eq(verificationTokens.token, token),
      gt(verificationTokens.expires, new Date())
    ),
  });

  if (!tokenRecord) return err("Invalid or expired verification token", 400);

  await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.email, tokenRecord.identifier));

  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.token, token));

  logger.info("Auth: email verified", { email: tokenRecord.identifier });
  return ok({ success: true });
}
