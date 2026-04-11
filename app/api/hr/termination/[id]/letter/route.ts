import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { terminations, users, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { format } from "date-fns";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden", 403);

    const { id } = await params;
    const terminationId = Number(id);
    if (!terminationId) return err("Invalid ID.", 400);

    const termination = await db.query.terminations.findFirst({
      where: and(eq(terminations.id, terminationId), eq(terminations.orgId, session.orgId)),
      with: { user: true },
    });
    if (!termination) return err("Termination not found.", 404);

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.orgId),
    });

    const employee = termination.user;
    const letterHtml = generateTerminationLetter({
      employeeName: employee?.name ?? "Employee",
      designation: employee?.designation ?? "N/A",
      companyName: org?.name ?? "the Company",
      reasons: termination.reasons ?? [],
      effectiveDate: termination.effectiveDate ? format(new Date(termination.effectiveDate), "dd MMM yyyy") : "N/A",
      severanceAmount: termination.severanceAmount,
      date: format(new Date(), "dd MMM yyyy"),
    });

    return ok({ html: letterHtml });
  });
}

function generateTerminationLetter(data: {
  employeeName: string;
  designation: string;
  companyName: string;
  reasons: string[];
  effectiveDate: string;
  severanceAmount: string | null;
  date: string;
}): string {
  const reasonsList = data.reasons.map((r) => `<li>${r}</li>`).join("\n");

  return `
<div style="font-family: 'Times New Roman', serif; max-width: 700px; margin: 0 auto; padding: 40px; line-height: 1.8;">
  <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">
    <h2 style="margin: 0;">${data.companyName}</h2>
    <p style="margin: 5px 0 0; font-size: 12px; color: #666;">CONFIDENTIAL</p>
  </div>

  <p style="text-align: right;">Date: ${data.date}</p>

  <p>To,<br/>
  <strong>${data.employeeName}</strong><br/>
  ${data.designation}<br/>
  ${data.companyName}</p>

  <p><strong>Subject: Termination of Employment</strong></p>

  <p>Dear ${data.employeeName},</p>

  <p>This letter is to formally notify you that your employment with <strong>${data.companyName}</strong> is being terminated, effective <strong>${data.effectiveDate}</strong>.</p>

  <p><strong>Reason(s) for Termination:</strong></p>
  <ul>${reasonsList}</ul>

  ${data.severanceAmount ? `<p><strong>Severance:</strong> You will receive a severance payment of <strong>INR ${data.severanceAmount}</strong>, subject to applicable deductions and taxes. This amount will be included in your final settlement.</p>` : ""}

  <p><strong>Final Settlement:</strong> Your final settlement, including any pending salary, leave encashment, and other dues, will be processed within 45 days from the effective date of termination.</p>

  <p><strong>Return of Company Property:</strong> You are required to return all company property including but not limited to: laptop, ID card, access cards, company phone, parking pass, and any other equipment issued to you. Please coordinate with HR for the handover process.</p>

  <p><strong>Confidentiality:</strong> Please be reminded that your obligations under the Non-Disclosure Agreement (NDA) signed at the time of your employment remain in effect even after termination. You must not disclose any confidential or proprietary information of the company.</p>

  <p>We wish you well in your future endeavors.</p>

  <p style="margin-top: 40px;">
  Sincerely,<br/><br/>
  <strong>Human Resources Department</strong><br/>
  ${data.companyName}
  </p>
</div>`.trim();
}
