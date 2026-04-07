import { withAuth, ok, err } from "@/lib/api/helpers";
import { generateTotpSecret, generateTotpUri, generateQrCodeDataUrl } from "@/lib/totp";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  return withAuth(async (session) => {
    const secret = generateTotpSecret();
    const uri = generateTotpUri(secret, session.user.email ?? session.user.id);
    const qrDataUrl = await generateQrCodeDataUrl(uri);

    // Store pending secret in user record — not enabled until verified
    await db.update(users).set({ totpSecret: secret }).where(eq(users.id, session.user.id));

    return ok({ qrDataUrl, secret, manualEntryKey: secret });
  });
}
