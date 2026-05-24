import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { appUrl } from "@/lib/app-url";

const BRAND_NAVY = "#0f2b7f";
const BRAND_GOLD = "#bd882c";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapShell(innerHtml: string, preheader: string): string {
  return `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
  <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
    <span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f7;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
            <tr>
              <td style="background:linear-gradient(135deg,${BRAND_NAVY},#1e40af);padding:28px 32px;text-align:left;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:10px;">
                      <div style="width:36px;height:36px;border-radius:9px;background:rgba(189,136,44,0.15);border:1px solid rgba(189,136,44,0.35);text-align:center;line-height:36px;color:${BRAND_GOLD};font-weight:700;font-size:18px;font-family:'Georgia','Times New Roman',serif;">V</div>
                    </td>
                    <td style="vertical-align:middle;">
                      <div style="font-family:'Georgia','Times New Roman',serif;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.3px;">Vaivamm Capital</div>
                      <div style="color:rgba(255,255,255,0.65);font-size:12px;margin-top:2px;">Careers</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${innerHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 26px;border-top:1px solid #eef0f4;background:#fafbfc;">
                <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6;">
                  &copy; ${new Date().getFullYear()} Vaivamm Capital. All rights reserved.<br/>
                  <a href="https://vaivammcapital.com/" style="color:${BRAND_NAVY};text-decoration:none;">vaivammcapital.com</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buttonHtml(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:8px;background:${BRAND_NAVY};">
        <a href="${href}" style="display:inline-block;padding:12px 26px;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export async function sendApplicantConfirmationEmail(params: {
  to: string;
  name: string;
  jobTitle: string;
}): Promise<void> {
  const firstName = params.name.trim().split(/\s+/)[0] || "there";
  const inner = `
    <h1 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:700;font-family:'Georgia','Times New Roman',serif;">
      Thanks for applying, ${escapeHtml(firstName)}!
    </h1>
    <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6;">
      We&rsquo;ve received your application for <strong style="color:#0f172a;">${escapeHtml(params.jobTitle)}</strong>
      and our hiring team will review it shortly.
    </p>

    <div style="margin:24px 0;padding:18px;border:1px solid #e5e7eb;border-radius:10px;background:#fafbfc;">
      <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${BRAND_GOLD};">What happens next</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="padding:6px 0;color:#1f2937;font-size:14px;"><strong style="color:${BRAND_NAVY};">1.</strong>&nbsp;&nbsp;We&rsquo;ll review your profile within <strong>3–5 business days</strong>.</td></tr>
        <tr><td style="padding:6px 0;color:#1f2937;font-size:14px;"><strong style="color:${BRAND_NAVY};">2.</strong>&nbsp;&nbsp;If there&rsquo;s a fit, we&rsquo;ll reach out for a <strong>20-minute intro call</strong>.</td></tr>
        <tr><td style="padding:6px 0;color:#1f2937;font-size:14px;"><strong style="color:${BRAND_NAVY};">3.</strong>&nbsp;&nbsp;Final round &mdash; <strong>meet the team</strong> and the hiring panel.</td></tr>
      </table>
    </div>

    <p style="margin:0 0 8px;color:#4b5563;font-size:14px;line-height:1.6;">
      In the meantime, feel free to explore Vaivamm and our work.
    </p>
    ${buttonHtml("Learn more about Vaivamm", "https://vaivammcapital.com/")}

    <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">
      Warmly,<br/>
      <strong style="color:#0f172a;">The Vaivamm Capital Hiring Team</strong>
    </p>
  `;

  try {
    await sendEmail({
      to: params.to,
      subject: `Application received — ${params.jobTitle}`,
      html: wrapShell(inner, `We've received your application for ${params.jobTitle}.`),
    });
  } catch (error) {
    logger.error("Applicant confirmation email failed", { error, to: params.to });
  }
}

export async function sendHrNewApplicationEmail(params: {
  to: string | string[];
  jobTitle: string;
  jobLocation: string | null;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string | null;
  linkedinUrl: string | null;
  resumeUrl: string | null;
  candidateId: number;
  jobId: number;
  coverLetter: string | null;
}): Promise<void> {
  const candidateLink = `${appUrl}/hr/recruitment/candidates/${params.candidateId}`;
  const resumeProxyUrl = params.resumeUrl
    ? `${appUrl}/api/hr/recruitment/candidates/${params.candidateId}/resume`
    : null;

  const rowHtml = (label: string, valueHtml: string) => `
    <tr>
      <td style="padding:8px 0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;width:120px;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:8px 0;color:#0f172a;font-size:14px;line-height:1.5;">${valueHtml}</td>
    </tr>`;

  const linkOrDash = (url: string | null, label: string) =>
    url
      ? `<a href="${escapeHtml(url)}" style="color:${BRAND_NAVY};text-decoration:underline;">${escapeHtml(label)}</a>`
      : `<span style="color:#9ca3af;">—</span>`;

  const inner = `
    <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${BRAND_GOLD};">
      New application
    </p>
    <h1 style="margin:0 0 6px;color:#0f172a;font-size:22px;font-weight:700;font-family:'Georgia','Times New Roman',serif;">
      ${escapeHtml(params.candidateName)} applied for ${escapeHtml(params.jobTitle)}
    </h1>
    ${params.jobLocation ? `<p style="margin:0 0 18px;color:#6b7280;font-size:13px;">${escapeHtml(params.jobLocation)}</p>` : `<div style="height:8px;"></div>`}

    <div style="margin:0 0 18px;padding:18px;border:1px solid #e5e7eb;border-radius:10px;background:#fafbfc;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        ${rowHtml("Name", escapeHtml(params.candidateName))}
        ${rowHtml("Email", `<a href="mailto:${escapeHtml(params.candidateEmail)}" style="color:${BRAND_NAVY};text-decoration:none;">${escapeHtml(params.candidateEmail)}</a>`)}
        ${rowHtml("Phone", params.candidatePhone ? escapeHtml(params.candidatePhone) : `<span style="color:#9ca3af;">—</span>`)}
        ${rowHtml("LinkedIn", linkOrDash(params.linkedinUrl, "View profile"))}
        ${rowHtml("Resume", linkOrDash(resumeProxyUrl, "Open resume"))}
      </table>
    </div>

    ${params.coverLetter ? `
      <div style="margin:0 0 18px;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#6b7280;">Cover letter</p>
        <div style="padding:14px 16px;border-left:3px solid ${BRAND_GOLD};background:#fffaf0;color:#1f2937;font-size:13px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(params.coverLetter)}</div>
      </div>
    ` : ""}

    ${buttonHtml("Review candidate in CRM", candidateLink)}

    <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">
      Source: Careers page · Job ID #${params.jobId}
    </p>
  `;

  try {
    await sendEmail({
      to: params.to,
      subject: `New application — ${params.candidateName} for ${params.jobTitle}`,
      html: wrapShell(inner, `${params.candidateName} just applied for ${params.jobTitle}.`),
    });
  } catch (error) {
    logger.error("HR new-application email failed", { error, to: params.to });
  }
}
