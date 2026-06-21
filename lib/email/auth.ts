import { sendEmail } from "./sender";
import { appUrl } from "../app-url";
import {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getPasswordChangeConfirmationEmailTemplate,
  getAccountLockedEmailTemplate,
  getNewDeviceLoginEmailTemplate,
  getPasswordExpiryWarningEmailTemplate,
} from "../email-templates";

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${appUrl}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify Your Email - StreamlineOS",
    html: getVerificationEmailTemplate(verificationUrl),
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset Your Password - StreamlineOS",
    html: getPasswordResetEmailTemplate(resetUrl),
  });
}

export async function sendPasswordChangeConfirmationEmail(
  email: string,
  userName: string
) {
  await sendEmail({
    to: email,
    subject: "Password Changed Successfully - StreamlineOS",
    html: getPasswordChangeConfirmationEmailTemplate(userName),
  });
}

export async function sendAccountLockedEmail(email: string, name: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Account Locked - StreamlineOS",
    html: getAccountLockedEmailTemplate(name),
  });
}

export async function sendNewDeviceLoginEmail(
  email: string,
  name: string,
  deviceInfo: { userAgent: string; ipAddress: string; time: string }
): Promise<void> {
  await sendEmail({
    to: email,
    subject: "New Device Sign-In Detected - StreamlineOS",
    html: getNewDeviceLoginEmailTemplate(name, deviceInfo),
  });
}

export async function sendPasswordExpiryWarningEmail(
  email: string,
  name: string,
  daysLeft: number
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `Your Password Expires in ${daysLeft} Days - StreamlineOS`,
    html: getPasswordExpiryWarningEmailTemplate(name, daysLeft),
  });
}
