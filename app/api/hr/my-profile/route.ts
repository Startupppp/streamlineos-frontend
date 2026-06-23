import { withAuth, ok, err , parseBody} from "@/lib/api/helpers"; 
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { decrypt, encryptBankDetails, decryptBankDetails } from "@/lib/encryption";

const updateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().max(15).optional(),
  whatsappNumber: z.string().max(15).optional(),
  emergencyContact: z.object({
    name: z.string().min(1),
    relation: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email().optional(),
  }).optional(),
  bankDetails: z.object({
    accountNumber: z.string().min(1),
    bankName: z.string().min(1),
    branch: z.string().min(1),
    ifsc: z.string().min(1),
    accountHolder: z.string().min(1),
    pfUanNumber: z.string().optional(),
  }).optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });
    if (!user) return err("User not found.", 404);
    const { password, totpSecret, googleRefreshToken, bankDetails, taxId, ...profile } = user;
    return ok({
      ...profile,
      taxId: taxId ? decrypt(taxId) : null,
      bankDetails: decryptBankDetails(bankDetails),
    });
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, updateSchema);
    await db.update(users).set({
      ...(body.firstName && { firstName: body.firstName }),
      ...(body.lastName && { lastName: body.lastName }),
      ...(body.firstName && body.lastName && { name: `${body.firstName} ${body.lastName}` }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.whatsappNumber !== undefined && { whatsappNumber: body.whatsappNumber }),
      ...(body.emergencyContact && { emergencyContact: body.emergencyContact }),
      ...(body.bankDetails && { bankDetails: encryptBankDetails(body.bankDetails) }),
    }).where(eq(users.id, session.user.id));
    return ok({ success: true });
  });
}
