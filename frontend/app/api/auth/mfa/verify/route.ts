import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { verifyTotpToken, verifyBackupCode } from "@/lib/totp";
import { db } from "@/lib/db";
import { users, mfaBackupCodes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { invalidateUserSession } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";

const schema = z.union([
  z.object({ token: z.string().length(6), backupCode: z.undefined() }),
  z.object({ backupCode: z.string().min(1), token: z.undefined() }),
]);

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    let body: z.infer<typeof schema>;
    try {
      const json = await req.json();
      body = schema.parse(json);
    } catch {
      return err("Invalid request", 400);
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
    if (!user?.totpSecret) return err("No pending MFA setup", 400);

    if (body.backupCode !== undefined) {
      const unusedCodes = await db.query.mfaBackupCodes.findMany({
        where: eq(mfaBackupCodes.userId, session.user.id),
      });

      const unusedOnly = unusedCodes.filter((c) => c.usedAt === null);

      for (const entry of unusedOnly) {
        const match = await verifyBackupCode(body.backupCode, entry.codeHash);
        if (match) {
          await db
            .update(mfaBackupCodes)
            .set({ usedAt: new Date() })
            .where(eq(mfaBackupCodes.id, entry.id));

          await db.update(users).set({ totpEnabled: true }).where(eq(users.id, session.user.id));
          await invalidateUserSession(session.user.id);
          return ok({ enabled: true });
        }
      }
      return err("Invalid backup code", 400);
    }

    const valid = verifyTotpToken(body.token!, decrypt(user.totpSecret));
    if (!valid) return err("Invalid token", 400);

    await db.update(users).set({ totpEnabled: true }).where(eq(users.id, session.user.id));
    await invalidateUserSession(session.user.id);

    return ok({ enabled: true });
  });
}
