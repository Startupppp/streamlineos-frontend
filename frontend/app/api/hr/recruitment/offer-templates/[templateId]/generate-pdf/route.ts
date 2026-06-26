import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { offerLetterTemplates, candidates, jobPostings, candidateOffers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { NextRequest } from "next/server";

const schema = z.object({
  candidateName: z.string().optional().default("Candidate"),
  designation: z.string().optional().default(""),
  salary: z.string().optional().default(""),
  joiningDate: z.string().optional().default(""),
  validUntil: z.string().optional().default(""),
  orgName: z.string().optional().default(""),
});

type RouteContext = { params: Promise<{ templateId: string }> };

function applyPlaceholders(html: string, vars: Record<string, string>): string {
  return html
    .replace(/\{\{candidate_name\}\}/g, vars.candidateName ?? "")
    .replace(/\{\{designation\}\}/g, vars.designation ?? "")
    .replace(/\{\{salary\}\}/g, vars.salary ?? "")
    .replace(/\{\{joining_date\}\}/g, vars.joiningDate ?? "")
    .replace(/\{\{valid_until\}\}/g, vars.validUntil ?? "")
    .replace(/\{\{org_name\}\}/g, vars.orgName ?? "");
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "  • ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const { templateId } = await params;
    const id = Number(templateId);
    if (!Number.isFinite(id)) return err("Invalid template ID", 400);

    const template = await db.query.offerLetterTemplates.findFirst({
      where: and(eq(offerLetterTemplates.id, id), eq(offerLetterTemplates.orgId, session.orgId)),
    });
    if (!template) return err("Template not found", 404);

    const body = await parseBody(req, schema);

    const hydrated = applyPlaceholders(template.htmlContent, {
      candidateName: body.candidateName,
      designation: body.designation,
      salary: body.salary,
      joiningDate: body.joiningDate,
      validUntil: body.validUntil,
      orgName: body.orgName,
    });

    const plainText = stripHtml(hydrated);

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 60;
    const lineHeight = 18;
    const fontSize = 11;
    const maxWidth = pageWidth - margin * 2;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const lines = plainText.split("\n");

    for (const rawLine of lines) {
      const words = rawLine.split(" ");
      let current = "";

      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        const width = font.widthOfTextAtSize(test, fontSize);
        if (width > maxWidth && current) {
          if (y < margin + lineHeight) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
          page.drawText(current, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
          y -= lineHeight;
          current = word;
        } else {
          current = test;
        }
      }

      if (current.trim()) {
        if (y < margin + lineHeight) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        page.drawText(current, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      }
      y -= lineHeight;
    }

    const pdfBytes = await pdfDoc.save();
    const base64 = Buffer.from(pdfBytes).toString("base64");

    return ok({ base64, mimeType: "application/pdf", fileName: `offer-letter-${body.candidateName.replace(/\s+/g, "-")}.pdf` });
  });
}
