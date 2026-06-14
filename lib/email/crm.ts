import { sendEmail } from "./sender";
import {
  getDealStageChangeEmailTemplate,
  getLeadAssignedEmailTemplate,
} from "../email-templates";

export async function sendDealStageChangeEmail(
  email: string,
  recipientName: string,
  dealName: string,
  previousStage: string,
  newStage: string,
  dealValue: string | null,
  changedBy: string,
  dealId: number
) {
  await sendEmail({
    to: email,
    subject: `Deal ${newStage === "WON" ? "Won" : newStage === "LOST" ? "Lost" : "Updated"}: ${dealName}`,
    html: getDealStageChangeEmailTemplate(recipientName, dealName, previousStage, newStage, dealValue, changedBy, dealId),
  });
}

export async function sendLeadAssignedEmail(
  email: string,
  repName: string,
  leadName: string,
  source: string,
  priority: string,
  assignedBy: string
) {
  await sendEmail({
    to: email,
    subject: `New Lead Assigned: ${leadName}`,
    html: getLeadAssignedEmailTemplate(repName, leadName, source, priority, assignedBy),
  });
}
