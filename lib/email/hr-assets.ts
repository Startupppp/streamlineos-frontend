import { sendEmail } from "./sender";
import { getAssetAssignedEmailTemplate } from "../email-templates";

export async function sendAssetAssignedEmail(
  email: string,
  employeeName: string,
  assetName: string,
  assetType: string,
  serialNumber: string | null
) {
  await sendEmail({
    to: email,
    subject: `Asset Assigned: ${assetName}`,
    html: getAssetAssignedEmailTemplate(employeeName, assetName, assetType, serialNumber),
  });
}
