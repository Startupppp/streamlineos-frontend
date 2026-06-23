import { withAuth, ok, err , parseBody} from "@/lib/api/helpers"; 
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { z } from "zod";
import type { NextRequest } from "next/server";

const candidateRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  currentCompany: z.string().optional(),
  currentRole: z.string().optional(),
  source: z.string().optional(),
  skills: z.string().optional(),
});

const importSchema = z.object({
  candidates: z.array(candidateRowSchema).min(1, "At least one candidate required").max(500),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:employees"))  return err("Only admins can bulk import.", 403);

    const body = await parseBody(req, importSchema);
    const values = body.candidates.map((c) => ({
      orgId: session.orgId,
      firstName: c.firstName.trim(),
      lastName: c.lastName.trim(),
      email: c.email.toLowerCase().trim(),
      phone: c.phone,
      currentCompany: c.currentCompany,
      currentRole: c.currentRole,
      source: c.source ?? "IMPORT",
      skills: c.skills ? c.skills.split(",").map((s) => s.trim()) : undefined,
      status: "NEW" as const,
    }));

    const inserted = await db.insert(candidates).values(values).returning({ id: candidates.id });

    return ok({ imported: inserted.length }, 201);
  });
}
