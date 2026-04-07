import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { emailTemplates, candidates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const sendSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  templateId: z.number().int().positive().optional(),
  candidateId: z.number().int().positive().optional(),
  variables: z.record(z.string(), z.string()).optional(),
});

function replaceVariables(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Only admins can send emails.", 403);

    const smtpHost = process.env.SMTP_HOST;
    const smtpFrom = process.env.SMTP_FROM_EMAIL;

    if (!smtpHost || !smtpFrom) {
      return err("Email not configured. Set SMTP_HOST and SMTP_FROM_EMAIL.", 400);
    }

    const body = sendSchema.parse(await req.json());
    let subject = body.subject;
    let emailBody = body.body;

    if (body.templateId) {
      const template = await db.query.emailTemplates.findFirst({
        where: and(eq(emailTemplates.id, body.templateId), eq(emailTemplates.orgId, session.orgId)),
      });
      if (template) {
        subject = template.subject;
        emailBody = template.body;
      }
    }

    if (body.candidateId) {
      const candidate = await db.query.candidates.findFirst({
        where: and(eq(candidates.id, body.candidateId), eq(candidates.orgId, session.orgId)),
      });
      if (candidate) {
        const autoVars: Record<string, string> = {
          candidateName: `${candidate.firstName} ${candidate.lastName}`,
          candidateEmail: candidate.email,
          candidateFirstName: candidate.firstName,
          candidateLastName: candidate.lastName,
        };
        const vars = Object.fromEntries(Object.entries(body.variables ?? {}).map(([k, v]) => [k, String(v)]));
        subject = replaceVariables(subject, { ...autoVars, ...vars });
        emailBody = replaceVariables(emailBody, { ...autoVars, ...vars });
      }
    } else if (body.variables) {
      const vars = Object.fromEntries(Object.entries(body.variables).map(([k, v]) => [k, String(v)]));
      subject = replaceVariables(subject, vars);
      emailBody = replaceVariables(emailBody, vars);
    }

    try {
      const { sendEmail } = await import("@/lib/email/sender");
      await sendEmail({
        to: body.to,
        subject,
        html: emailBody,
      });
      return ok({ sent: true, to: body.to, subject });
    } catch (e) {
      return err(`Failed to send email: ${e instanceof Error ? e.message : "Unknown error"}`, 502);
    }
  });
}
