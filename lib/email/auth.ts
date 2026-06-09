import { sendEmail } from "./sender";
import { baseUrl } from "./sender";
import {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getInvitationEmailTemplate,
  getWelcomeEmailTemplate,
  getPasswordChangeConfirmationEmailTemplate,
  getAccountDeactivationEmailTemplate,
  getAccountLockedEmailTemplate,
  getNewDeviceLoginEmailTemplate,
  getPasswordExpiryWarningEmailTemplate,
} from "../email-templates";

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify Your Email - StreamlineOS",
    html: getVerificationEmailTemplate(verificationUrl),
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset Your Password - StreamlineOS",
    html: getPasswordResetEmailTemplate(resetUrl),
  });
}

export async function sendInvitationEmail(
  email: string,
  token: string,
  organizationName: string,
  inviterName?: string
) {
  const invitationUrl = `${baseUrl}/invitation/${token}`;
  await sendEmail({
    to: email,
    subject: `Invitation to join ${organizationName} - StreamlineOS`,
    html: getInvitationEmailTemplate(invitationUrl, organizationName, inviterName),
  });
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
  setupUrl: string
) {
  await sendEmail({
    to: email,
    subject: "Welcome to StreamlineOS — Set Up Your Account",
    html: getWelcomeEmailTemplate(name, email, setupUrl),
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

export async function sendAccountDeactivationEmail(
  email: string,
  employeeName: string,
  deactivatedBy: string,
  reason?: string
) {
  await sendEmail({
    to: email,
    subject: "Account Deactivated - StreamlineOS",
    html: getAccountDeactivationEmailTemplate(employeeName, deactivatedBy, reason),
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
