import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { extractResumeText, parseResumeText } from "@/lib/services/hr/resume-parser";

const ALLOWED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword", "text/plain"];
const MAX_SIZE = 5 * 1024 * 1024;

type Params = { params: Promise<{ candidateId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN" && role !== "HR_MANAGER") {
      return err("Forbidden", 403);
    }

    const { candidateId: cidParam } = await params;
    const candidateId = Number(cidParam);
    if (!Number.isFinite(candidateId)) return err("Invalid candidate ID", 400);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
      columns: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });
    if (!candidate) return err("Candidate not found", 404);

    const contentType = req.headers.get("content-type") ?? "";

    let text: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) return err("No file provided", 400);
      if (file.size > MAX_SIZE) return err("File too large (max 5MB)", 400);
      if (!ALLOWED_TYPES.includes(file.type)) return err("Unsupported file type. Please upload a PDF, DOCX, or TXT file.", 400);

      const buffer = Buffer.from(await file.arrayBuffer());
      text = await extractResumeText(buffer, file.type);
    } else {
      const body = await req.json();
      if (typeof body.resumeText !== "string" || !body.resumeText.trim()) {
        return err("resumeText is required", 400);
      }
      text = body.resumeText.slice(0, 100000);
    }

    const parsed = await parseResumeText(text);

    await db
      .update(candidates)
      .set({ resumeText: text.slice(0, 100000), updatedAt: new Date() })
      .where(eq(candidates.id, candidateId));

    return ok({
      parsed,
      suggestions: {
        firstName: parsed.name && !candidate.firstName ? parsed.name.split(" ")[0] : null,
        lastName: parsed.name && !candidate.firstName ? (parsed.name.split(" ").slice(1).join(" ") || null) : null,
        email: parsed.email && !candidate.email ? parsed.email : null,
        phone: parsed.phone && !candidate.phone ? parsed.phone : null,
        currentCompany: parsed.currentCompany,
        currentRole: parsed.currentRole,
        experienceYears: parsed.experienceYears,
        skills: parsed.skills,
        location: parsed.location,
        linkedinUrl: parsed.linkedinUrl,
        portfolioUrl: parsed.portfolioUrl,
      },
    });
  });
}
