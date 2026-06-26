import { withAuth, ok, err, parseBody } from "@/lib/api/helpers"; 
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { candidates, jobPostings, richDocuments, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const schema = z.object({
  candidateId: z.number().int().positive(),
  jobPostingId: z.number().int().positive(),
  salary: z.string().min(1),
  startDate: z.string().min(1),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:employees"))  return err("Only admins can generate offer letters.", 403);

    const body = await parseBody(req, schema);

    const [candidate, job, org] = await Promise.all([
      db.query.candidates.findFirst({
        where: and(eq(candidates.id, body.candidateId), eq(candidates.orgId, session.orgId)),
      }),
      db.query.jobPostings.findFirst({
        where: and(eq(jobPostings.id, body.jobPostingId), eq(jobPostings.orgId, session.orgId)),
      }),
      db.query.organizations.findFirst({
        where: eq(organizations.id, session.orgId),
        columns: { name: true },
      }),
    ]);

    if (!candidate) return err("Candidate not found.", 404);
    if (!job) return err("Job posting not found.", 404);

    const companyName = org?.name ?? "Our Organization";
    const candidateName = `${candidate.firstName} ${candidate.lastName}`;
    const content = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Offer Letter" }] },
        { type: "paragraph", content: [{ type: "text", text: `Date: ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}` }] },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: `Dear ${candidateName},` }] },
        { type: "paragraph", content: [{ type: "text", text: `We are pleased to offer you the position of ${job.title} at ${companyName}. Your start date will be ${body.startDate}.` }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Compensation" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: `Annual CTC: ₹${body.salary}` }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: `Position: ${job.title}` }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: `Location: ${job.location ?? "As per company policy"}` }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: `Start Date: ${body.startDate}` }] }] },
        ]},
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "Please confirm your acceptance by signing below within 7 business days." }] },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "We look forward to having you on our team!" }] },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "Best regards," }] },
        { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: `HR Team — ${companyName}` }] },
      ],
    };

    const [doc] = await db.insert(richDocuments).values({
      orgId: session.orgId,
      title: `Offer Letter - ${candidateName} - ${job.title}`,
      contentJson: content,
      templateType: "offer_letter",
      isPublished: false,
      version: 1,
      createdBy: session.user.id,
    }).returning();

    return ok({ documentId: doc.id, title: doc.title }, 201);
  });
}
