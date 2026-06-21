import { getEmailTemplate, escapeHtml } from "../base";

export function getCandidateRejectionEmail(params: {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  senderName?: string;
  notes?: string;
}): { subject: string; html: string } {
  const sCandidateName = escapeHtml(params.candidateName);
  const sJobTitle = escapeHtml(params.jobTitle);
  const sCompanyName = escapeHtml(params.companyName);
  const sSenderName = params.senderName ? escapeHtml(params.senderName) : sCompanyName;

  const content = `
    <p class="email-text">Dear ${sCandidateName},</p>
    <p class="email-text">
      Thank you for attending the interview with <strong>${sCompanyName}</strong>.
    </p>
    <p class="email-text">
      After careful consideration, we regret to inform you that we will not be proceeding
      with your application at this time.
    </p>
    ${params.notes ? `<p class="email-text" style="color: #475569;">${escapeHtml(params.notes)}</p>` : ""}
    <p class="email-text">
      We appreciate your interest in our organization and wish you all the best in your
      future endeavors.
    </p>
    <p class="email-text">
      Kind regards,<br/>
      <strong>${sSenderName}</strong><br/>
      ${sCompanyName}
    </p>
  `;

  const subject = `Update on your application — ${sJobTitle} at ${sCompanyName}`;

  return {
    subject,
    html: getEmailTemplate({ title: subject, preheader: "Thank you for applying", content }),
  };
}

export function getInterviewInviteEmail(params: {
  recipientName: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  scheduledAt: string;
  durationMinutes: number;
  format: string;
  meetingLink?: string;
  location?: string;
  notes?: string;
  recipientRole: "candidate" | "interviewer";
}): { subject: string; html: string } {
  const sRecipient = escapeHtml(params.recipientName);
  const sCandidate = escapeHtml(params.candidateName);
  const sJob = escapeHtml(params.jobTitle);
  const sCompany = escapeHtml(params.companyName);
  const sFormat = escapeHtml(params.format);
  const sDate = escapeHtml(params.scheduledAt);
  const sMeetLink = params.meetingLink ? escapeHtml(params.meetingLink) : null;
  const sLocation = params.location ? escapeHtml(params.location) : null;
  const sNotes = params.notes ? escapeHtml(params.notes) : null;

  const isCandidate = params.recipientRole === "candidate";
  const durationLabel =
    params.durationMinutes >= 60
      ? `${params.durationMinutes / 60}h`
      : `${params.durationMinutes}min`;

  const content = `
    <h2 class="email-title">📅 Interview Scheduled${isCandidate ? "" : " — Action Required"}</h2>
    <p class="email-text">Dear ${sRecipient},</p>
    <p class="email-text">
      ${
        isCandidate
          ? `We are pleased to invite you to interview for the <strong>${sJob}</strong> position at <strong>${sCompany}</strong>.`
          : `You have been assigned as an interviewer for <strong>${sCandidate}</strong> applying for the <strong>${sJob}</strong> role.`
      }
    </p>

    <div class="credential-box">
      ${
        !isCandidate
          ? `<div class="credential-item">
               <span class="credential-label">Candidate:</span>
               <span class="credential-value">${sCandidate}</span>
             </div>`
          : ""
      }
      <div class="credential-item">
        <span class="credential-label">Position:</span>
        <span class="credential-value">${sJob}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Date &amp; Time:</span>
        <span class="credential-value">${sDate}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Duration:</span>
        <span class="credential-value">${durationLabel}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Format:</span>
        <span class="credential-value">${sFormat}</span>
      </div>
      ${
        sMeetLink
          ? `<div class="credential-item">
               <span class="credential-label">Meeting Link:</span>
               <span class="credential-value"><a href="${sMeetLink}" style="color:#1e40af">${sMeetLink}</a></span>
             </div>`
          : ""
      }
      ${
        sLocation
          ? `<div class="credential-item">
               <span class="credential-label">Location:</span>
               <span class="credential-value">${sLocation}</span>
             </div>`
          : ""
      }
    </div>

    ${sNotes ? `<p class="email-text"><strong>Notes:</strong> ${sNotes}</p>` : ""}

    <p class="email-text">
      ${
        isCandidate
          ? "Please confirm your availability. If you need to reschedule, contact HR as soon as possible."
          : "Please review the candidate's profile and prepare your evaluation criteria before the interview."
      }
    </p>
  `;

  const subject = isCandidate
    ? `Interview Invitation — ${sJob} at ${sCompany}`
    : `Interview Assigned: ${sCandidate} — ${sJob}`;

  return {
    subject,
    html: getEmailTemplate({
      title: isCandidate ? "Interview Invitation" : "Interview Assigned",
      preheader: `${sFormat} interview on ${sDate} — ${durationLabel}`,
      content,
    }),
  };
}
