import { inngest } from "../client";
import { sendEmail } from "@/lib/email/sender";
import { appUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";

export const offerDeadlineReminder = inngest.createFunction(
  { id: "offer-deadline-reminder", name: "Offer Deadline Reminder (24h)", triggers: { event: "hr/offer.deadline.reminder" } },
  async ({ event }) => {
    const { candidateName, candidateEmail, deadline, documentIds } = event.data as {
      candidateId: number;
      candidateName: string;
      candidateEmail: string;
      deadline: string;
      documentIds: number[];
      orgId: string;
    };

    const deadlineDate = new Date(deadline);
    const deadlineStr = deadlineDate.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "short",
    });

    const docLinks = documentIds
      .map(
        (id) =>
          `<li><a href="${appUrl}/api/hr/recruitment/candidates/documents/${id}/view" style="color:#bd882c">View Document</a></li>`
      )
      .join("\n");

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#0f2b7f">Offer Acceptance Reminder</h2>
        <p>Dear ${candidateName},</p>
        <p>This is a friendly reminder that your offer acceptance deadline is in <strong>24 hours</strong>.</p>
        <p><strong>Deadline:</strong> ${deadlineStr}</p>
        <p>Please review and sign the following document(s) before the deadline:</p>
        <ul style="margin:16px 0;padding-left:24px">
          ${docLinks}
        </ul>
        <p>If you have any questions, please reach out to your HR contact.</p>
        <p style="color:#666;font-size:12px;margin-top:32px">
          This is an automated reminder from StreamlineOS HR system.
        </p>
      </div>
    `;

    try {
      await sendEmail({
        to: candidateEmail,
        subject: "Reminder: Offer Acceptance Deadline in 24 Hours",
        html,
      });
    } catch (e) {
      logger.error("offer-deadline-reminder: failed to send email", { error: e, candidateEmail });
      throw e;
    }
  }
);
