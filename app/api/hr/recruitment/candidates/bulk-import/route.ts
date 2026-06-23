import { withAuth, ok, err, parseBody } from "@/lib/api/helpers"; 
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const rowSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(200),
  phone: z.string().max(50).optional().nullable(),
  currentCompany: z.string().max(200).optional().nullable(),
  currentRole: z.string().max(200).optional().nullable(),
  resumeUrl: z.string().url().max(500).optional().nullable(),
  linkedinUrl: z.string().url().max(500).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  skills: z.string().max(1000).optional().nullable(),
  experienceYears: z.number().min(0).max(60).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
});

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(500),
});

type Row = z.infer<typeof rowSchema>;

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN" && role !== "HR_MANAGER") {
      return err("Forbidden", 403);
    }

    const body = await parseBody(req, bodySchema);

    const existingCandidates = await db.query.candidates.findMany({
      where: eq(candidates.orgId, session.orgId),
      columns: { email: true },
    });
    const existingEmails = new Set(existingCandidates.map((c) => c.email.toLowerCase()));

    const results = { created: 0, skipped: 0, errors: [] as string[] };
    const toInsert: Array<{
      orgId: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      currentCompany: string | null;
      currentRole: string | null;
      resumeUrl: string | null;
      linkedinUrl: string | null;
      location: string | null;
      skills: string[];
      source: string;
      status: "NEW";
    }> = [];

    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i] as Row;
      const emailLower = row.email.toLowerCase();

      if (existingEmails.has(emailLower)) {
        results.skipped++;
        continue;
      }

      existingEmails.add(emailLower);
      toInsert.push({
        orgId: session.orgId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: emailLower,
        phone: row.phone ?? null,
        currentCompany: row.currentCompany ?? null,
        currentRole: row.currentRole ?? null,
        resumeUrl: row.resumeUrl ?? null,
        linkedinUrl: row.linkedinUrl ?? null,
        location: row.location ?? null,
        skills: row.skills ? row.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
        source: row.source ?? "IMPORT",
        status: "NEW",
      });
    }

    if (toInsert.length > 0) {
      const chunkSize = 50;
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize);
        await db.insert(candidates).values(chunk).onConflictDoNothing();
        results.created += chunk.length;
      }
    }

    return ok(results, 201);
  });
}
